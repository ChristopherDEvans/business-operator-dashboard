import fs from "fs";
import { config } from "./config.js";
import { bot } from "./bot.js";
import { initializeTools } from "./tools/registry.js";
import { startHeartbeat } from "./heartbeat.js";

async function runSafetyChecks() {
  console.log("🛡️ Running Startup Safety Checks...");

  // 1. Validate Telegram allowed user IDs
  if (!config.allowedUserIds || config.allowedUserIds.length === 0) {
    console.error("❌ ALLOWED_USER_IDS must contain at least one valid numeric Telegram user ID.");
    process.exit(1);
  }
  console.log(`✓ Telegram allowed users: ${config.allowedUserIds.join(", ")}`);

  // 2. Validate Supabase URL/key presence
  if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn("⚠️ Supabase is not fully configured (SUPABASE_URL / SUPABASE_KEY missing). Running in manual/offline mode.");
  } else {
    console.log("✓ Supabase configuration present.");
  }

  // 3. Validate template vault/generated sites paths
  if (!config.templateVaultPath) {
    console.warn("⚠️ TEMPLATE_VAULT_PATH is not configured. Website Factory will run in manual mode.");
  } else if (!fs.existsSync(config.templateVaultPath)) {
    console.warn(`⚠️ TEMPLATE_VAULT_PATH folder does not exist: "${config.templateVaultPath}". Website Factory will run in manual mode.`);
  } else {
    console.log("✓ Template vault path verified.");
  }

  if (!config.generatedSitesPath) {
    console.warn("⚠️ GENERATED_SITES_PATH is not configured. Website Factory will run in manual mode.");
  } else if (!fs.existsSync(config.generatedSitesPath)) {
    console.warn(`⚠️ GENERATED_SITES_PATH folder does not exist: "${config.generatedSitesPath}". Output folders will be created dynamically.`);
  } else {
    console.log("✓ Generated sites path verified.");
  }

  // 4. Validate Railway env readiness
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL;
  if (isRailway) {
    console.log("✓ Production environment (Railway) detected.");
    const requiredProd = ["TELEGRAM_BOT_TOKEN", "OPENROUTER_API_KEY", "ALLOWED_USER_IDS", "SUPABASE_URL", "SUPABASE_KEY"];
    for (const key of requiredProd) {
      if (!process.env[key]) {
        console.error(`❌ Missing required production env var on Railway: ${key}`);
        process.exit(1);
      }
    }
  }

  // 5. Warn if running local bot while Railway bot is active
  if (config.supabaseUrl && config.supabaseKey) {
    try {
      const { supabase } = await import("./lib/supabase.js");
      if (supabase) {
        const { data: statusRow } = await supabase
          .from("bot_config")
          .select("*")
          .eq("key", "bot_status")
          .maybeSingle();

        if (statusRow && statusRow.value === "Online (Railway)" && !isRailway) {
          console.warn("⚠️ [WARNING] A production instance (Railway) is currently active in the cloud.");
          console.warn("   Running this local instance concurrently may result in duplicate Telegram replies and race conditions for command polling.");
          console.warn("   Action: Pause the Railway service if you intend to test locally.");
        }

        // Upsert current status
        await supabase.from("bot_config").upsert([
          { key: "llm_model", value: config.llmModel },
          { key: "bot_status", value: isRailway ? "Online (Railway)" : "Online (Local)" }
        ]);
        console.log(`✓ Synced bot status to dashboard: Online (${isRailway ? "Railway" : "Local"}).`);
      }
    } catch (e: any) {
      console.warn("⚠️ Dashboard status sync failed:", e.message || e);
    }
  }
}

// ── Startup ────────────────────────────────────────────
async function main() {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║         🦀  GRAVITY CLAW  🦀          ║
  ║    Personal AI Agent — Level 1        ║
  ╚═══════════════════════════════════════╝
  `);

  console.log(`🤖 Model:      ${config.llmModel}`);
  console.log(`🔒 Allowed:    ${config.allowedUserIds.length} user(s)`);
  console.log(`🔄 Max loops:  ${config.maxAgentIterations}`);

  // Run checks
  await runSafetyChecks();

  // 1. Initialize MCP Tools & Heartbeat on startup
  try {
    await initializeTools();
    startHeartbeat(); 
  } catch (error) {
    console.error("⚠️ Failed to initialize tools or heartbeat:", error);
  }

  // 2. Start Telegram bot
  console.log(`📡 Starting Telegram long-polling…\n`);
  
  bot.start({
    drop_pending_updates: true,
    onStart: (botInfo) => {
      console.log(`✅ Bot online as @${botInfo.username}`);
      console.log(`   Send a message on Telegram to get started.\n`);
    },
  });
}

// ── Graceful shutdown ──────────────────────────────────
function shutdown(signal: string) {
  console.log(`\n🛑 ${signal} received — shutting down gracefully…`);
  bot.stop();
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Launch
main().catch(console.error);
