import { config } from "../../config.js";
import { supabase } from "../../lib/supabase.js";

/**
 * ── Hermes Context Adapter ──
 * Consumes strategic context, goals, and priority records from shared database tables.
 */
export class HermesAdapter {
  private syncPath: string;

  constructor() {
    this.syncPath = config.hermesSyncPath || "";
  }

  /**
   * Sync and retrieve current strategic priorities for the EvansAiSolutions ecosystem.
   */
  async getStrategicContext(): Promise<string> {
    if (this.syncPath) {
      console.log(`[Hermes] Fetching context from external path: ${this.syncPath}`);
      // In the future, read JSON files or run a sync executable
    }

    if (!supabase) {
      return "Hermes context sync unavailable (No Supabase client).";
    }

    try {
      // Fetch shared goals or priorities from Supabase bot_config
      const { data, error } = await supabase
        .from("bot_config")
        .select("value")
        .eq("key", "strategic_priorities")
        .single();

      if (error || !data) {
        return "No strategic priorities found in Supabase config (Hermes defaults).";
      }

      return data.value;
    } catch (e: any) {
      console.error("[Hermes] Failed to fetch context from Supabase:", e.message);
      return "Error pulling context from shared memory.";
    }
  }

  /**
   * Sync local user memories with Hermes shared storage.
   */
  async syncSharedMemories(userId: number): Promise<void> {
    console.log(`[Hermes] Triggered memory sync for user ${userId}.`);
    // Future sync implementation
  }
}

export const hermes = new HermesAdapter();
