import { upsertFact, searchMessages, searchFacts } from "../memory.js";
import { supabase } from "../lib/supabase.js";

/**
 * ── Tool: remember_fact ────────────────────────────────
 */
export async function rememberFact(args: { fact: string; category?: string }, userId: number) {
  const { fact, category } = args;

  if (!fact) {
    return JSON.stringify({ error: "No fact provided to remember." });
  }

  console.log(`🧠 [Memory]: Saving fact for user ${userId}: "${fact}"${category ? ` (Category: ${category})` : ""}`);

  try {
    await upsertFact(userId, fact, { category });
    return JSON.stringify({ success: true, message: `I've memorized that: ${fact}` });
  } catch (error) {
    console.error("❌ remember_fact error:", error);
    return JSON.stringify({ error: "Failed to save memory." });
  }
}

/**
 * ── Tool: recall_memory ────────────────────────────────
 */
export async function recallMemory(args: { query: string; limit?: number; type?: 'conversation' | 'knowledge' | 'both' }, userId: number) {
  const { query, limit = 5, type = 'both' } = args;
  
  try {
    const results: any = {};
    
    if (type === 'conversation' || type === 'both') {
      results.conversations = await searchMessages(userId, query, limit);
    }
    
    if (type === 'knowledge' || type === 'both') {
      results.knowledge = await searchFacts(userId, query, limit);
    }
    
    return JSON.stringify({ success: true, results });
  } catch (error: any) {
    return JSON.stringify({ error: `Recall failed: ${error.message}` });
  }
}

/**
 * ── Tool: save_data ────────────────────────────────────
 */
export async function saveData(args: { table: string; data: any }, userId: number) {
  if (!supabase) return JSON.stringify({ error: "Supabase not configured." });
  
  try {
    const { error } = await supabase.from(args.table).insert({ ...args.data, user_id: userId });
    if (error) throw error;
    return JSON.stringify({ success: true, message: `Data saved to ${args.table}.` });
  } catch (error: any) {
    return JSON.stringify({ error: `Save failed: ${error.message}` });
  }
}

/**
 * ── Tool: query_data ───────────────────────────────────
 */
export async function queryData(args: { table: string; filter?: any; limit?: number }, userId: number) {
  if (!supabase) return JSON.stringify({ error: "Supabase not configured." });
  
  try {
    let query = supabase.from(args.table).select('*').eq('user_id', userId);
    
    if (args.filter) {
      for (const [key, value] of Object.entries(args.filter)) {
        query = query.eq(key, value);
      }
    }
    
    if (args.limit) {
      query = query.limit(args.limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return JSON.stringify({ success: true, data });
  } catch (error: any) {
    return JSON.stringify({ error: `Query failed: ${error.message}` });
  }
}

export const rememberFactDefinition = {
  type: "function",
  function: {
    name: "remember_fact",
    description: "Save a core bit of information about the user or a topic to long-term memory. Use this for facts that shouldn't be forgotten (e.g., preferences, names, important events).",
    parameters: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description: "The specific fact or information to remember. Be concise but descriptive.",
        },
        category: {
          type: "string",
          description: "Optional category to group the memory (e.g., 'user_preference', 'identity', 'work').",
        },
      },
      required: ["fact"],
    },
  },
} as const;

export const recallMemoryDefinition = {
  type: "function",
  function: {
    name: "recall_memory",
    description: "Search your long-term memory for specific past conversations or knowledge facts. Use this when the user asks 'what did we talk about regarding X?' or 'what do you know about Y?'.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
        limit: { type: "integer", description: "Number of results to return (default: 5)." },
        type: { type: "string", enum: ["conversation", "knowledge", "both"], description: "The type of memory to search." }
      },
      required: ["query"]
    }
  }
} as const;

export const saveDataDefinition = {
  type: "function",
  function: {
    name: "save_data",
    description: "Save structured data to the Supabase data store. Use this for logging events, saving settings, or tabular data.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "The table name." },
        data: { type: "object", description: "The data object to insert." }
      },
      required: ["table", "data"]
    }
  }
} as const;

export const queryDataDefinition = {
  type: "function",
  function: {
    name: "query_data",
    description: "Query structured data from the Supabase data store.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "The table name." },
        filter: { type: "object", description: "Optional filter key-value pairs." },
        limit: { type: "integer", description: "Number of results to return." }
      },
      required: ["table"]
    }
  }
} as const;
