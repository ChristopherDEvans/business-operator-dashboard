import type {
  ChatCompletionTool,
} from "openai/resources/chat/completions.js";
import * as getCurrentTime from "./get-current-time.js";
import * as speak from "./speak.js";
import * as memory from "./memory_tools.js";
import { clickupCreateTaskTool } from "./clickup_create_task.js";
import { ingest_knowledge } from "./ingest_knowledge.js";
import { update_soul } from "./update_soul.js";
import { generate_invoice } from "./generate_invoice.js";
import { daily_briefing } from "./daily_briefing.js";
import { set_reminder } from "./reminders.js";
import { MultiMcpClient } from "../lib/mcp.js";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";
import { saveMessageLocal, saveCoreFactsLocal } from "../lib/db.js";
import { supabase } from "../lib/supabase.js";

// ── MCP Initialization ────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RELATIVE_MCP_CONFIG = path.join(process.cwd(), "mcp_config.json");
const FALLBACK_MCP_CONFIG = "C:/Users/CEvns/.gemini/config/mcp_config.json";

// Prefer: 1. ENV variable, 2. Project root (for Docker), 3. Local fallback
const MCP_CONFIG_PATH = process.env.MCP_CONFIG_PATH || 
                       (fs.existsSync(RELATIVE_MCP_CONFIG) ? RELATIVE_MCP_CONFIG : FALLBACK_MCP_CONFIG);

const mcpClient = new MultiMcpClient(MCP_CONFIG_PATH);

// ── Internal Tool Registry ────────────────────────────
export interface GravityTool {
  definition: ChatCompletionTool;
  execute: (input: Record<string, unknown>, userId: number) => string | Promise<string>;
}

const localTools: Record<string, GravityTool> = {
  get_current_time: {
    definition: {
      type: "function",
      function: {
        name: "get_current_time",
        description: "Returns the current date and time. Use this for anything time-related.",
        parameters: { type: "object", properties: { timezone: { type: "string" } }, required: [] },
      },
    },
    execute: (input, _userId) => getCurrentTime.execute(input as { timezone?: string }),
  },
  speak: {
    definition: speak.definition,
    execute: (input, _userId) => speak.execute(input as { text: string }),
  },
  remember_fact: {
    definition: memory.rememberFactDefinition,
    execute: (input, userId) => memory.rememberFact(input as { fact: string; category?: string }, userId),
  },
  recall_memory: {
    definition: memory.recallMemoryDefinition,
    execute: (input, userId) => memory.recallMemory(input as any, userId),
  },
  save_data: {
    definition: memory.saveDataDefinition,
    execute: (input, userId) => memory.saveData(input as any, userId),
  },
  query_data: {
    definition: memory.queryDataDefinition,
    execute: (input, userId) => memory.queryData(input as any, userId),
  },
  clickup_create_task: {
    definition: {
      type: "function",
      function: {
        name: "clickup_create_task",
        description: clickupCreateTaskTool.description,
        parameters: { 
          type: "object", 
          properties: { 
            name: { type: "string", description: "The name or title of the task" },
            description: { type: "string", description: "Detailed description of what needs to be done" },
            listId: { type: "string", description: "The ID of the ClickUp list to create the task in." },
            status: { type: "string", enum: ["to do", "in progress", "complete"], description: "Task status (default: to do)" },
            priority: { type: "integer", description: "Priority (1=Urgent, 2=High, 3=Normal, 4=Low)" }
          }, 
          required: ["name", "description"] 
        },
      },
    },
    execute: (input, _userId) => clickupCreateTaskTool.execute(input as any),
  },

  ingest_knowledge: {
    definition: ingest_knowledge.definition,
    execute: (input, userId) => ingest_knowledge.execute(input as { url: string; context?: string }, userId!),
  },
  update_soul: {
    definition: update_soul.definition,
    execute: (input) => update_soul.execute(input as { instruction: string }),
  },
  generate_invoice: {
    definition: generate_invoice.definition,
    execute: (input) => generate_invoice.execute(input as { customerName: string; items: any[]; invoiceNumber?: string }),
  },
  daily_briefing: {
    definition: daily_briefing.definition,
    execute: (input, userId) => daily_briefing.execute(input as { location?: string }, userId),
  },
  set_reminder: {
    definition: set_reminder.definition,
    execute: (input, userId) => set_reminder.execute(input as any, userId),
  },

};

// ── Dynamic State ─────────────────────────────────────
let initialized = false;
let toolList: ChatCompletionTool[] = [];

/**
 * Initialize all tools, including external MCP servers.
 */
export async function initializeTools() {
  if (initialized) return;

  console.log("🛠️ Initializing Tool Registry...");
  
  // 1. Start with local tools
  toolList = Object.values(localTools).map(t => t.definition);

  // 2. Add MCP tools
  try {
    await mcpClient.initialize();
    const mcpTools = await mcpClient.getAllTools();
    
    for (const mcpTool of mcpTools) {
      toolList.push({
        type: "function",
        function: {
          name: mcpTool.name,
          description: `[MCP: ${mcpTool.serverName}] ${mcpTool.description || "No description provided."}`,
          parameters: mcpTool.inputSchema as any
        }
      });
    }
  } catch (error) {
    console.error("❌ Failed to initialize MCP tools:", error);
  }

  initialized = true;
  console.log(`✅ Tool Registry ready with ${toolList.length} tools.`);
}

/** Get tool definitions for the LLM */
export function getToolDefinitions(): ChatCompletionTool[] {
  return toolList;
}

/**
 * Execute a tool (local or MCP)
 */
export async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: number,
): Promise<string> {
  // 1. Try local tools first
  if (localTools[name]) {
    console.log(`  🔧 [Local] Tool call: ${name}`);
    return await localTools[name].execute(input, userId);
  }

  // 2. Try MCP tools
  try {
    console.log(`  🔌 [MCP] Tool call: ${name}`);
    const result = await mcpClient.callTool(name, input);
    
    // Convert MCP result to string
    if (result.isError) {
      return `Error in MCP tool call: ${JSON.stringify(result.content)}`;
    }
    
    return (result.content as any[]).map((c: any) => 
      c.type === 'text' ? c.text : JSON.stringify(c)
    ).join("\n");

  } catch (error: any) {
    return JSON.stringify({ error: `Tool ${name} not found or failed: ${error.message}` });
  }
}
