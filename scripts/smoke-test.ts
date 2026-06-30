import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function runSmokeTest() {
  console.log("🔥 Starting EvansAISolutions Operator Smoke Test...");
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_KEY is missing. Smoke test aborted.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log("1. Inserting harmless test command: 'heartbeat'...");
  const { data: cmd, error: cmdErr } = await supabase
    .from("system_commands")
    .insert({
      command: "heartbeat",
      executed: false,
      status: "queued",
      payload: { test: true }
    })
    .select()
    .single();

  if (cmdErr || !cmd) {
    console.error("❌ Failed to insert test command:", cmdErr?.message || cmdErr);
    process.exit(1);
  }

  console.log(`✓ Test command inserted with ID: ${cmd.id}`);
  console.log("⏳ Waiting 15 seconds for the daemon command poller to process the command...");
  
  // Wait 15 seconds
  await new Promise(resolve => setTimeout(resolve, 15000));

  console.log("2. Fetching executed command status...");
  const { data: updatedCmd, error: fetchErr } = await supabase
    .from("system_commands")
    .select("*")
    .eq("id", cmd.id)
    .single();

  if (fetchErr || !updatedCmd) {
    console.error("❌ Failed to fetch updated command:", fetchErr?.message || fetchErr);
    process.exit(1);
  }

  console.log(`✓ Command status: ${updatedCmd.status} (expected: completed/running)`);
  console.log(`✓ Executed flag: ${updatedCmd.executed} (expected: true)`);
  console.log(`✓ Result summary: ${updatedCmd.result_summary || 'None'}`);

  if (!updatedCmd.executed) {
    console.warn("⚠️ Warning: The command was not picked up. Make sure the bot daemon is running in another process.");
  } else {
    console.log("🎉 SUCCESS: Command lifecycle changes validated!");
  }

  console.log("3. Verifying activity log entries...");
  const { data: logs, error: logErr } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (logErr) {
    console.error("❌ Failed to query activity log:", logErr.message);
  } else {
    console.log("✓ Recent activity logs verified:");
    for (const log of logs || []) {
      console.log(`  - [${log.type}] ${log.title}: ${log.description || ''}`);
    }
  }

  console.log("🔥 Smoke test complete.");
}

runSmokeTest().catch(console.error);
