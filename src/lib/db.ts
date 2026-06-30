import Database from "better-sqlite3";
import type { Database as DatabaseType } from "better-sqlite3";
import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../gravity-claw.db");

// Ensure the directory exists
const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db: DatabaseType = new Database(DB_PATH);

// Initialize Tables (Tier 1 Schema)
db.exec(`
  CREATE TABLE IF NOT EXISTS core_memory (
    user_id INTEGER PRIMARY KEY,
    facts TEXT, -- JSON array of strings
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS summaries (
    user_id INTEGER PRIMARY KEY,
    summary TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    message TEXT,
    due_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    fired INTEGER DEFAULT 0
  );
`);

/**
 * ── Tier 1 Management Functions ─────────────────────────
 */

export function saveMessageLocal(userId: number, role: string, content: string) {
  const id = `${userId}-${Date.now()}`;
  const stmt = db.prepare("INSERT INTO messages (id, user_id, role, content) VALUES (?, ?, ?, ?)");
  stmt.run(id, userId, role, content);
}

export function getRecentHistory(userId: number, limit = 20) {
  const stmt = db.prepare("SELECT role, content FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
  return stmt.all(userId, limit).reverse() as { role: string; content: string }[];
}

export const getSessionHistory = getRecentHistory;

export function saveCoreFactsLocal(userId: number, facts: string[]) {
  const stmt = db.prepare("INSERT INTO core_memory (user_id, facts, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET facts = excluded.facts, updated_at = excluded.updated_at");
  stmt.run(userId, JSON.stringify(facts));
}

export function getCoreFactsLocal(userId: number): string[] {
  const stmt = db.prepare("SELECT facts FROM core_memory WHERE user_id = ?");
  const row = stmt.get(userId) as { facts: string } | undefined;
  return row ? JSON.parse(row.facts) : [];
}

export function saveSummaryLocal(userId: number, summary: string) {
  const stmt = db.prepare("INSERT INTO summaries (user_id, summary, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at");
  stmt.run(userId, summary);
}

export function getSummaryLocal(userId: number): string {
  const stmt = db.prepare("SELECT summary FROM summaries WHERE user_id = ?");
  const row = stmt.get(userId) as { summary: string } | undefined;
  return row ? row.summary : "";
}

/**
 * Compaction check: If message count > threshold, return true.
 */
export function shouldCompact(userId: number, threshold = 30): boolean {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM messages WHERE user_id = ?");
  const row = stmt.get(userId) as { count: number };
  return row.count >= threshold;
}

/**
 * Prune old messages after compaction.
 */
export function pruneMessages(userId: number, keep = 5) {
  const stmt = db.prepare("DELETE FROM messages WHERE user_id = ? AND id NOT IN (SELECT id FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?)");
  stmt.run(userId, userId, keep);
}

/**
 * ── Reminder Management ────────────────────────────────
 */

export function saveReminderLocal(userId: number, message: string, dueAt: string) {
  const id = `rem-${Date.now()}`;
  const stmt = db.prepare("INSERT INTO reminders (id, user_id, message, due_at) VALUES (?, ?, ?, ?)");
  stmt.run(id, userId, message, dueAt);
}

export function getDueRemindersLocal() {
  const now = new Date().toISOString();
  const stmt = db.prepare("SELECT * FROM reminders WHERE due_at <= ? AND fired = 0");
  return stmt.all(now) as { id: string, user_id: number, message: string, due_at: string }[];
}

export function markReminderFiredLocal(id: string) {
  const stmt = db.prepare("UPDATE reminders SET fired = 1 WHERE id = ?");
  stmt.run(id);
}
