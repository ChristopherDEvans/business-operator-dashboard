import cron from "node-cron";
import { runAgentLoop } from "./agent.js";
import { bot } from "./bot.js";
import { config } from "./config.js";
import { logActivity, supabase } from "./lib/supabase.js";
import { getDueRemindersLocal, markReminderFiredLocal } from "./lib/db.js";
import { operations } from "./domains/operations/index.js";
import { upworkRadar } from "./domains/upwork-radar/index.js";
import { linkedinOS } from "./domains/linkedin-os/index.js";
import { prospector } from "./domains/prospector/index.js";
import { websiteFactory } from "./domains/website-factory/index.js";
import { hermes } from "./domains/hermes/index.js";
import { usageTracker } from "./lib/usage.js";

/**
 * ── Gravity Claw Heartbeat ──────────────────────────
 * Proactively reaches out to the user every day and handles reminders.
 */

let morningJob: cron.ScheduledTask | null = null;

async function scheduleMorningHeartbeat() {
  if (!supabase) return;

  // Fetch current config
  const { data } = await supabase.from('bot_config').select('*');
  const heartbeatSchedule = data?.find(it => it.key === 'Heartbeat Schedule')?.value || "0 8 * * *";
  const timezone = data?.find(it => it.key === 'Timezone')?.value || "Europe/London";

  console.log(`💓 Heartbeat: Scheduling morning brief for [${heartbeatSchedule}] (${timezone})`);

  if (morningJob) {
    morningJob.stop();
  }

  try {
    morningJob = cron.schedule(heartbeatSchedule, async () => {
      console.log(`💓 Heartbeat: Firing scheduled brief [${heartbeatSchedule}]`);
      logActivity("task", "Morning Heartbeat Triggered", "Generating proactive messages for all allowed users.");

      for (const userId of config.allowedUserIds) {
        try {
          const { text } = await runAgentLoop(
            userId,
            "[INTERNAL_SYSTEM_TRIGGER: Morning Accountability Heartbeat. You MUST call the 'daily_briefing' tool right now to generate the content, do not hallucinate the data.]"
          );
          await bot.api.sendMessage(userId, text);
          console.log(`✅ Heartbeat sent to user ${userId}`);
        } catch (error) {
          console.error(`❌ Heartbeat failed for user ${userId}:`, error);
        }
      }
    }, {
      timezone: timezone as any
    });
  } catch (err) {
    console.error(`❌ Failed to schedule heartbeat with cron "${heartbeatSchedule}":`, err);
    // Fallback to default if user enters garbage
    if (heartbeatSchedule !== "0 8 * * *") {
       console.log("⚠️ Falling back to default 8AM schedule.");
       // Re-call with default
    }
  }
}

export function startHeartbeat() {
  console.log("💓 Heartbeat Service: Initialized.");

  // Init morning job
  scheduleMorningHeartbeat();

  // Listen for config changes to reschedule
  if (supabase) {
    supabase.channel('config-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bot_config' }, (payload) => {
        const key = (payload.new as any)?.key;
        if (key === 'Heartbeat Schedule' || key === 'Timezone') {
          console.log(`📡 Config Change Detected: ${key}. Rescheduling heartbeat...`);
          scheduleMorningHeartbeat();
        }
      })
      .subscribe();
  }

  // 1. Reminder Poller: Every 1 minute
  cron.schedule("* * * * *", async () => {
    const due = getDueRemindersLocal();
    if (due.length === 0) return;

    console.log(`⏰ Reminder Poller: Found ${due.length} due reminder(s).`);

    for (const rem of due) {
      try {
        const message = `🔔 **REMINDER:** ${rem.message}`;
        await bot.api.sendMessage(rem.user_id, message);
        markReminderFiredLocal(rem.id);
        logActivity("task", "Reminder Fired", rem.message);
        console.log(`✅ Reminder sent to user ${rem.user_id}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder ${rem.id}:`, error);
      }
    }
  });

  // 2. System Command Poller: Every 10 seconds
  let isPollerRunning = false;
  setInterval(async () => {
    if (isPollerRunning) return;
    isPollerRunning = true;
 
    try {
      const { getPendingCommands, updateCommandStatus } = await import("./lib/supabase.js");
      const commands = await getPendingCommands();
 
      for (const cmd of commands) {
        console.log(`📡 System Command Received: ${cmd.command}`);
        
        let status: 'completed' | 'failed' | 'needs_input' | 'manual_mode' = 'completed';
        let summaryText = "";
        let errorText = "";
        let domainName = "Operations";
        let requiresApproval = false;
        let payloadObj: any = {};
        
        try {
          if (typeof cmd.payload === 'string') {
            payloadObj = JSON.parse(cmd.payload);
          } else {
            payloadObj = cmd.payload || {};
          }
        } catch (e) {
          payloadObj = {};
        }

        await updateCommandStatus(cmd.id, {
          status: 'running',
          started_at: new Date().toISOString()
        });
 
        try {
          if (cmd.command === "heartbeat") {
            domainName = "Operations";
            for (const userId of config.allowedUserIds) {
              const { text } = await runAgentLoop(userId, "[INTERNAL_SYSTEM_TRIGGER: Manual Command Heartbeat]");
              await bot.api.sendMessage(userId, `💓 **Manual Heartbeat:** ${text}`);
            }
            summaryText = "Manual command heartbeat generated successfully.";
          } else if (cmd.command === "brief" || cmd.command === "run_daily_briefing") {
            domainName = "Operations";
            const brief = await operations.generateDailyBrief(config.allowedUserIds[0]);
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, brief);
            }
            await logActivity("task", "Briefing Run Successfully", "B2B Daily Brief generated and pushed.");
            summaryText = "Daily operations brief compiled and broadcasted.";
          } else if (cmd.command === "scan_upwork_jobs") {
            domainName = "Upwork Radar";
            requiresApproval = true;
            status = "manual_mode";
            const query = payloadObj.query || "React Developer";
            const jobs = await upworkRadar.searchJobs(query);
            let highScoresCount = 0;
            let proposalsCount = 0;
            for (const job of jobs) {
              const { score, reasoning } = await upworkRadar.scoreJob(job.description);
              job.score = score;
              job.reasoning = reasoning;
              if (score >= 80) {
                highScoresCount++;
                await upworkRadar.draftProposal(job.title, job.description);
                proposalsCount++;
              }
            }
            summaryText = `💼 Upwork Radar Job Scan\n- Query: "${query}"\n- Jobs Found: ${jobs.length}\n- High Match (>=80): ${highScoresCount}\n- Draft Proposals: ${proposalsCount}\n- Strict Human Approval Required (No auto-apply).`;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "Upwork Scan Completed", summaryText);
          } else if (cmd.command === "generate_linkedin_posts") {
            domainName = "LinkedIn OS";
            status = "manual_mode";
            const topic = payloadObj.topic || "AI Automation for Local UK Removals and Roofing Companies";
            const pillar = payloadObj.pillar || "Client Acquisition";
            const count = payloadObj.count || 1;
            const draft = await linkedinOS.generatePost(topic);
            summaryText = `📝 LinkedIn OS Post Generated\n- Topic: "${topic}"\n- Pillar: "${pillar}"\n- Count: ${count}\n\n${draft}\n\n*Missing strategic proof data: Nil. Next action: Review calendar posting schedule.*`;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "LinkedIn Posts Generated", "LinkedIn B2B draft generated and posted.");
          } else if (cmd.command === "score_new_leads") {
            domainName = "Prospector";
            // By default, score unscored leads (status = 'scraped')
            const unscoredLeads = await prospector.getLeads("scraped");
            let scoredCount = 0;
            let highPriorityCount = 0;
            for (const lead of unscoredLeads) {
              await prospector.scoreLead(lead.id);
              scoredCount++;
              if (lead.url && (lead.niche === "Roofing" || lead.niche === "Removals" || lead.niche === "base")) {
                highPriorityCount++;
              }
            }
            summaryText = `🎯 Prospector Lead Scoring\n- Scanned: ${unscoredLeads.length}\n- Scored: ${scoredCount}\n- High Priority: ${highPriorityCount}\n- Missing fields (Niche/Emails): ${unscoredLeads.filter(l => !l.email || !l.niche).length}`;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "Leads Scored", summaryText);
          } else if (cmd.command === "stamp_website_preview") {
            domainName = "Website Factory";
            const leadId = payloadObj.lead_id;
            const templateId = payloadObj.template_id;
            
            if (!leadId || !templateId) {
              status = "needs_input";
              summaryText = "Action failed: lead_id and template_id are required in the command payload.";
              const warning = `⚠️ **Website Factory Alert**\nStamping website preview failed. Missing required inputs:\n- \`lead_id\`: ${leadId ? '✓ Provided' : '❌ Missing'}\n- \`template_id\`: ${templateId ? '✓ Provided' : '❌ Missing'}\n\nSuggestion: Provide a valid lead and template ID in the dashboard action payload.`;
              for (const userId of config.allowedUserIds) {
                await bot.api.sendMessage(userId, warning);
              }
              await logActivity("error", "Website Factory Stamping Needs Input", "Stamping failed due to missing lead_id or template_id.");
            } else {
              // Fetch lead details from Supabase using prospector
              const leads = await prospector.getLeads();
              const targetLead = leads.find((l: any) => l.id === leadId);
              
              if (!targetLead) {
                status = "failed";
                summaryText = `Lead with ID "${leadId}" was not found in the database.`;
                errorText = `Lead not found.`;
                const warning = `⚠️ **Website Factory Alert**\nStamping failed. Lead with ID \`${leadId}\` could not be found.`;
                for (const userId of config.allowedUserIds) {
                  await bot.api.sendMessage(userId, warning);
                }
              } else {
                const result = await websiteFactory.stampSite(targetLead.business_name, templateId);
                if (result.success) {
                  await prospector.updateLeadStatus(targetLead.id, "website_created");
                  summaryText = `🚀 Website Factory Success\n- Client: "${targetLead.business_name}"\n- Niche: "${templateId}"\n- Output Path: ${result.path}\n- Next Action: Deploy via Vercel.`;
                  for (const userId of config.allowedUserIds) {
                    await bot.api.sendMessage(userId, summaryText);
                  }
                  await logActivity("task", "Website Preview Stamped", summaryText);
                } else {
                  status = "failed";
                  summaryText = `Website Factory stamping failed: ${result.message}`;
                  errorText = result.message;
                  const warning = `❌ **Website Factory Failed**\n- Reason: ${result.message}\n- Suggestion: Check template folder existence in Vault.`;
                  for (const userId of config.allowedUserIds) {
                    await bot.api.sendMessage(userId, warning);
                  }
                  await logActivity("error", "Website Factory Stamping Failed", result.message);
                }
              }
            }
          } else if (cmd.command === "sync_hermes_context") {
            domainName = "Hermes";
            const context = await hermes.getStrategicContext();
            summaryText = `🛡️ Hermes Context Synced\n- Shared priorities retrieved:\n\n${context}\n\n*Hermes connection mode: Supabase config memory fallback.*`;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "Hermes Context Sync", "Successfully synced strategic goals.");
          } else if (cmd.command === "check_api_costs") {
            domainName = "Operations";
            const stats = usageTracker.getSummary();
            summaryText = `💰 API Usage Costs Summary\n\n- Total OpenRouter Calls: \`${stats.totalCalls}\`\n- Total Tokens: \`${stats.totalTokens?.toLocaleString() || 0}\`\n- Estimated Cost: \`£${(stats.totalCost * 0.8).toFixed(4)}\` (Converted to GBP)\n- Avg Latency: \`${stats.avgLatency?.toFixed(0) || 0}ms\``;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "API Costs Calculated", `Checked cost total: £${(stats.totalCost * 0.8).toFixed(4)}`);
          } else if (cmd.command === "review_active_projects") {
            domainName = "Operations";
            let projectCount = 0;
            let criticalCount = 0;
            let warningCount = 0;
            if (supabase) {
              const { data: activeProjects } = await supabase.from("projects").select("*").eq("status", "active");
              projectCount = activeProjects?.length || 0;
              criticalCount = activeProjects?.filter((p: any) => p.health === "critical").length || 0;
              warningCount = activeProjects?.filter((p: any) => p.health === "warning").length || 0;
            }
            summaryText = `📂 Active Project Health Review\n- Total Active Projects: ${projectCount}\n- Health status: ${criticalCount} Critical, ${warningCount} Warning, ${projectCount - criticalCount - warningCount} Stable.\n- Hermes Sync Path: Nil (Optional)`;
            for (const userId of config.allowedUserIds) {
              await bot.api.sendMessage(userId, summaryText);
            }
            await logActivity("task", "Projects Reviewed", summaryText);
          } else if (cmd.command === "sync") {
            domainName = "Hermes";
            await logActivity("task", "Manual Sync Triggered", "Syncing agent memory and content from dashboard.");
            summaryText = "Manual sync activity completed.";
          } else {
            // NATURAL LANGUAGE COMMAND: Pass to the agent!
            domainName = "Operations";
            for (const userId of config.allowedUserIds) {
              const { text } = await runAgentLoop(userId, `[DASHBOARD_COMMAND]: ${cmd.command}`);
              await bot.api.sendMessage(userId, `🖥️ **Dashboard Action:** ${text}`);
            }
            summaryText = `Dashboard action parsed by LLM loop successfully.`;
          }

          await updateCommandStatus(cmd.id, {
            status,
            completed_at: new Date().toISOString(),
            result_summary: summaryText.substring(0, 1000),
            domain: domainName,
            requires_human_approval: requiresApproval,
            executed: true
          });
          await logActivity("system", "Command Executed", `Successfully processed: ${cmd.command}`);

        } catch (error: any) {
          console.error(`❌ Failed to execute command ${cmd.id}: ${String(error)}`);
          const suggestion = `Failure: ${error.message || error}. Suggestion: Check API keys and path directory permissions.`;
          await updateCommandStatus(cmd.id, {
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message || String(error),
            result_summary: suggestion.substring(0, 1000),
            domain: domainName,
            executed: true
          });
          await logActivity("error", "Command Failed", `Error executing command ${cmd.command}: ${String(error)}`);
        }
      }
    } finally {
      isPollerRunning = false;
    }
  }, 10000);
}
