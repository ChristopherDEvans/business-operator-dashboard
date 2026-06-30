import "dotenv/config";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

async function backup() {
  console.log("🎒 Starting EvansAISolutions Operator Backup...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(process.cwd(), "backups", `backup-${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Export SQLite DBs if they exist
  const sqliteFiles = ["gravity-claw.db", "usage.db"];
  for (const file of sqliteFiles) {
    const srcPath = path.join(process.cwd(), file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(backupDir, file);
      fs.copyFileSync(srcPath, destPath);
      console.log(`✓ SQLite Database backed up: ${file} -> ${destPath}`);
    } else {
      console.log(`- SQLite Database not found (skipped): ${file}`);
    }
  }

  // 2. Export Supabase Tables
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ SUPABASE_URL or SUPABASE_KEY is missing. Skipping Supabase tables export.");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const tables = ["system_commands", "activity_log", "leads", "campaigns", "projects"];

  for (const table of tables) {
    try {
      console.log(`📡 Fetching table: ${table}...`);
      const { data, error } = await supabase.from(table).select("*").limit(1000);
      if (error) throw error;

      const destPath = path.join(backupDir, `${table}.json`);
      fs.writeFileSync(destPath, JSON.stringify(data || [], null, 2));
      console.log(`✓ Supabase table exported: ${table} -> ${destPath} (${data?.length || 0} rows)`);
    } catch (err: any) {
      console.error(`❌ Failed to export Supabase table ${table}:`, err.message || err);
    }
  }

  console.log(`🎉 Backup completed successfully! Saved to: ${backupDir}`);
}

backup().catch(console.error);
