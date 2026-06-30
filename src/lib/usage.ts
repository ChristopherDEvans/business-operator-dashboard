import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

export interface UsageRecord {
  timestamp: string;
  userId: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
}

export class UsageTracker {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(process.cwd(), "usage.db");
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        userId INTEGER,
        model TEXT,
        promptTokens INTEGER,
        completionTokens INTEGER,
        totalTokens INTEGER,
        cost REAL,
        latencyMs INTEGER
      )
    `);
  }

  logUsage(record: Omit<UsageRecord, "timestamp">) {
    const stmt = this.db.prepare(`
      INSERT INTO usage (userId, model, promptTokens, completionTokens, totalTokens, cost, latencyMs)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      record.userId,
      record.model,
      record.promptTokens,
      record.completionTokens,
      record.totalTokens,
      record.cost,
      record.latencyMs
    );
  }

  getSummary(userId?: number) {
    let query = `
      SELECT 
        COUNT(*) as totalCalls,
        SUM(totalTokens) as totalTokens,
        SUM(cost) as totalCost,
        AVG(latencyMs) as avgLatency
      FROM usage
    `;
    const params: any[] = [];

    if (userId) {
      query += " WHERE userId = ?";
      params.push(userId);
    }

    return this.db.prepare(query).get(...params) as {
      totalCalls: number;
      totalTokens: number;
      totalCost: number;
      avgLatency: number;
    };
  }

  getDailyStats(userId?: number) {
    let query = `
      SELECT 
        date(timestamp) as day,
        SUM(totalTokens) as totalTokens,
        SUM(cost) as totalCost
      FROM usage
    `;
    const params: any[] = [];

    if (userId) {
      query += " WHERE userId = ?";
      params.push(userId);
    }

    query += " GROUP BY day ORDER BY day DESC LIMIT 7";

    return this.db.prepare(query).all(...params) as any[];
  }
}

export const usageTracker = new UsageTracker();

/**
 * Helper to estimate cost based on model prefix
 * Prices are illustrative and should be updated as needed.
 */
export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  let pRate = 0.000001; // Default
  let cRate = 0.000002;

  if (model.includes("claude-3-5-sonnet")) {
    pRate = 0.000003;
    cRate = 0.000015;
  } else if (model.includes("gpt-4o")) {
    pRate = 0.000005;
    cRate = 0.000015;
  } else if (model.includes("haiku")) {
    pRate = 0.00000025;
    cRate = 0.00000125;
  } else if (model.includes("flash")) {
    pRate = 0.0000001;
    cRate = 0.0000004;
  } else if (model.startsWith("local/")) {
    return 0;
  }

  return (promptTokens * pRate) + (completionTokens * cRate);
}
