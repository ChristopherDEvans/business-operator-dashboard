import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Server-side Supabase client for the bot.
 * Falls back to null if config is missing.
 */
export const supabase = config.supabaseUrl && config.supabaseKey
  ? createClient(config.supabaseUrl, config.supabaseKey)
  : null;

export async function logActivity(
  type: "message" | "tool" | "error" | "system" | "content" | "task",
  title: string,
  description?: string
) {
  if (!supabase) return;

  try {
    const { error } = await supabase.from("activity_log").insert({
      type,
      title,
      description,
    });
    if (error) {
      console.error("❌ Failed to log activity to Supabase:", error.message);
    }
  } catch (err) {
    console.error("❌ Exception while logging activity to Supabase:", err);
  }
}

export async function getPendingCommands() {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("system_commands")
      .select("*")
      .eq("executed", false)
      .order("created_at", { ascending: true });

    if (error) {
      const msg = error.message || "Unknown error";
      if (msg.includes("502 Bad Gateway") || msg.includes("<html")) {
        console.error("❌ Failed to fetch commands from Supabase: 502 Bad Gateway (Cloudflare)");
      } else {
        console.error("❌ Failed to fetch commands from Supabase:", msg.length > 200 ? msg.substring(0, 200) + "..." : msg);
      }
      return [];
    }
    return data || [];
  } catch (err: any) {
    const msg = err.message || String(err);
    if (msg.includes("502 Bad Gateway") || msg.includes("<html")) {
      console.error("❌ Exception fetching commands from Supabase: 502 Bad Gateway (Cloudflare)");
    } else {
      console.error("❌ Exception fetching commands from Supabase:", msg.length > 200 ? msg.substring(0, 200) + "..." : msg);
    }
    return [];
  }
}

export async function updateCommandStatus(
  id: string,
  updates: Partial<{
    status: 'queued' | 'running' | 'completed' | 'failed' | 'needs_input' | 'manual_mode';
    started_at: string;
    completed_at: string;
    result_summary: string;
    error_message: string;
    domain: string;
    requires_human_approval: boolean;
    executed: boolean;
  }>
) {
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from("system_commands")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error(`❌ Failed to update command ${id} status:`, error.message);
    }
  } catch (err: any) {
    console.error(`❌ Exception updating command ${id} status:`, err.message || err);
  }
}

export async function markCommandExecuted(id: string) {
  await updateCommandStatus(id, { executed: true, status: 'completed', completed_at: new Date().toISOString() });
}
