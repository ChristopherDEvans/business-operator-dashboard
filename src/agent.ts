import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions.js";
import { bot } from "./bot.js";
import { config } from "./config.js";
import { getToolDefinitions, executeTool, initializeTools } from "./tools/registry.js";
import { startHeartbeat } from "./heartbeat.js";
import {
  saveMessage,
  searchMessages,
  searchFacts,
  getCoreProfile,
  isMemoryEnabled,
  compactIfNecessary,
} from "./memory.js";
import { ProviderFactory } from "./lib/llm/factory.js";
import { FailoverProvider } from "./lib/llm/failover.js";
import { usageTracker, estimateCost } from "./lib/usage.js";
import { logActivity, supabase } from "./lib/supabase.js";

// ── Per-user active model ──────────────────────────────
const userModels = new Map<number, string>();

export function setActiveModel(userId: number, model: string) {
  userModels.set(userId, model);
}

export function getActiveModel(userId: number): string {
  return userModels.get(userId) || config.llmModel;
}

// ── OpenRouter client (OpenAI-compatible) ──────────────
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: config.openRouterApiKey,
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/gravity-claw",
    "X-Title": "Gravity Claw",
  },
});

// ── Soul & Prompt Loading ─────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOUL_PATH = path.join(__dirname, "soul.md");

async function getDynamicSystemPrompt(): Promise<string> {
  let soul = "You are Gravity Claw, a proactive AI assistant.";
  const now = new Date();
  const timeString = now.toLocaleString('en-GB', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Europe/London',
    timeZoneName: 'short'
  });

  try {
    // 1. Try to fetch from Supabase first (Dashboard settings)
    if (supabase) {
      const { data } = await supabase.from('bot_config').select('value').eq('key', 'system_prompt').single();
      if (data?.value) {
        soul = data.value;
      } else {
        // Fallback to local soul.md
        soul = fs.readFileSync(SOUL_PATH, "utf-8");
      }
    } else {
      soul = fs.readFileSync(SOUL_PATH, "utf-8");
    }
  } catch (err) {
    console.warn("⚠️ Could not load system prompt (DB or File), using basic fallback.");
  }

  return `${soul}

## ⚡ Temporal Truth (CRITICAL)
- **Current Real-World Time**: ${timeString}
- **Strict Adherence**: You MUST use the date and time provided above for all interactions. 
- **Ignore Hallucinations**: If your memory or past conversation history suggests a different date (e.g. from a past session), IGNORE IT completely. Today is ${timeString}.

## 🌍 Environment & Tools
- You run as a 24/7 personal intelligence agent.
- You have access to a **Three-Tier Memory System** (SQLite, Pinecone, Supabase).
- Current Mission Control Dashboard: ${config.missionControlUrl}

## 🚫 Voice Response Constraint
- **Strict Rule**: You must ONLY call the 'speak' tool if the user explicitly requests a voice note, speech, or audio response. If the user sends a standard text message or an internal trigger, you MUST respond in text only and DO NOT call the 'speak' tool.
`;
}

// ── Conversation history (Tier 1 Buffer) ───────────────
const historyCache = new Map<number, ChatCompletionMessageParam[]>();

import { getSessionHistory, saveMessageLocal } from "./lib/db.js";

async function getFullHistory(userId: number): Promise<ChatCompletionMessageParam[]> {
  if (!historyCache.has(userId)) {
    const localHistory = getSessionHistory(userId, 20);
    const formatted: ChatCompletionMessageParam[] = localHistory.map((h: any) => ({
      role: h.role as any,
      content: h.content
    }));
    historyCache.set(userId, formatted);
  }
  return historyCache.get(userId)!;
}

// ── Complexity-Aware Model Switching ────────────────────
function getOptimalModel(userMessage: string, currentActive: string): string {
  const msg = userMessage.toLowerCase();
  
  // 1. High-Value / Complex Strategic Tasks (requires Claude 3.5 Sonnet)
  const flagshipKeywords = [
    "strategy", "offer positioning", "positioning", "proposal", 
    "final audit", "audit report", "commercial decision", 
    "code", "fix", "refactor", "architect", "bug", "implement", "analyze"
  ];
  const isHighValue = flagshipKeywords.some(k => msg.includes(k));
  
  if (isHighValue) {
    console.log("🧠 [Brain Selector] High value/strategic task detected. Routing to Claude 3.5 Sonnet.");
    return "anthropic/claude-3.5-sonnet";
  }

  // 2. Cheap / Formatting / Clean Tasks (routes to Gemini 2.0 Flash)
  const cheapKeywords = [
    "extract", "clean", "list", "format", "score", "simple", "hello", "hi", "hey"
  ];
  const isCheap = cheapKeywords.some(k => msg.includes(k)) || userMessage.length < 150;

  if (isCheap) {
    if (currentActive.includes("groq/") || currentActive.includes("-haiku")) {
      return currentActive;
    }
    console.log("💰 [Brain Selector] Standard task detected. Routing to Gemini 2.0 Flash.");
    return "google/gemini-2.0-flash-001";
  }

  return currentActive; // Fallback to user-selected or default
}

// ── Agent loop ─────────────────────────────────────────
/**
 * Run the agentic tool loop for a user message.
 */
export async function runAgentLoop(
  userId: number,
  userMessage: string,
): Promise<{ text: string; voiceFiles: string[] }> {
  // Ensure tools are initialized
  await initializeTools();

  const history = await getFullHistory(userId);
  const voiceFiles: string[] = [];

  // 1. Retrieve 3-Tier Memory Context (parallel search)
  let memoryContext = "";
  if (isMemoryEnabled()) {
    const [semanticMatches, knowledgeMatches, coreProfile] = await Promise.all([
      searchMessages(userId, userMessage, 3), 
      searchFacts(userId, userMessage, 5),      
      getCoreProfile(userId),                  
    ]);

    if (coreProfile.length > 0) {
      memoryContext += "\n\n[USER PROFILE]\n" + coreProfile.join("\n");
    }
    if (knowledgeMatches.length > 0) {
      memoryContext += "\n\n[KNOWLEDGE BASE]\n" + knowledgeMatches.map(f => `- ${f.fact}`).join("\n");
    }
    if (semanticMatches.length > 0) {
      memoryContext += "\n\n[PAST CONVERSATIONS]\n" + semanticMatches.map(m => `[${m.role}]: ${m.content}`).join("\n");
    }
  }

  // Add user message to buffer and storage
  const userMsgObj: ChatCompletionMessageParam = { role: "user", content: userMessage };
  history.push(userMsgObj);
  saveMessage(userId, "user", userMessage); 
  logActivity("message", "User Message", userMessage);

  if (history.length > 40) history.shift();

  let iterations = 0;
  
  // Decide best model for this exchange
  const defaultModel = getActiveModel(userId);
  let activeModel = getOptimalModel(userMessage, defaultModel);
  
  // CRITICAL: Dashboard commands require maximum reasoning and tool accuracy
  if (userMessage.includes("[DASHBOARD_COMMAND]")) {
    console.log("🏙️ [Scale Processor] Dashboard command detected. Elevating to Claude 3.5 Sonnet.");
    activeModel = "anthropic/claude-3.5-sonnet";
  }
  
  const systemPrompt = await getDynamicSystemPrompt();

  while (iterations < config.maxAgentIterations) {
    iterations++;
    console.log(`\n🔄 Agent iteration ${iterations}/${config.maxAgentIterations}`);

    const primaryProvider = ProviderFactory.getProvider(activeModel);
    const provider = new FailoverProvider(primaryProvider);

    const fullMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt + (memoryContext ? `\n\n=== MEMORY CONTEXT ===${memoryContext}` : "") },
      ...history,
    ];

    const response = await provider.complete({
      model: activeModel,
      messages: fullMessages,
      tools: getToolDefinitions(),
    });

    const choice = response;
    if (!choice) throw new Error("No response from LLM");

    // Track usage
    usageTracker.logUsage({
      userId,
      model: activeModel,
      promptTokens: choice.usage.promptTokens,
      completionTokens: choice.usage.completionTokens,
      totalTokens: choice.usage.totalTokens,
      cost: estimateCost(activeModel, choice.usage.promptTokens, choice.usage.completionTokens),
      latencyMs: choice.latencyMs,
    });

    if (choice.toolCalls?.length) {
      history.push({ role: "assistant", content: null, tool_calls: choice.toolCalls } as any);

      let shouldTerminate = false;
      let spokenText = "";

      for (const toolCall of choice.toolCalls) {
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments || "{}"); } catch {}

        const result = await executeTool(toolCall.function.name, args, userId);
        logActivity("tool", `Tool: ${toolCall.function.name}`, result.substring(0, 100));

        let isFinalVoice = true; // Default to true for backwards compatibility
        try {
          const parsed = JSON.parse(result);
          if (parsed.voiceFilePath) {
            voiceFiles.push(parsed.voiceFilePath);
          }
          if (parsed.hasOwnProperty("final_response")) {
            isFinalVoice = parsed.final_response;
          }
        } catch {}

        if (toolCall.function.name === "speak") {
          shouldTerminate = true;
          spokenText = (args as any).text || "";
          console.log("🔊 Voice response generated — ending agent loop.");
        }

        history.push({ role: "tool", tool_call_id: toolCall.id, content: result });
      }

      if (shouldTerminate) {
        history.push({ role: "assistant", content: spokenText });
        saveMessage(userId, "assistant", spokenText);
        logActivity("system", "Assistant Response (Voice)", spokenText);

        // BACKGROUND TASK: Fact Extraction & Compaction
        (async () => {
          try {
            await compactIfNecessary(userId, openai);
          } catch (e) {
            console.error("❌ Background compaction failed:", e);
          }
        })();

        process.stdout.write(`✅ Success (Spoke to user, ${iterations} iterations)\n`);
        return { text: spokenText, voiceFiles };
      }

      continue;
    }

    const finalText = choice.text || "(No response)";
    history.push({ role: "assistant", content: finalText });
    saveMessage(userId, "assistant", finalText);
    logActivity("system", "Assistant Response", finalText);

    // BACKGROUND TASK: Fact Extraction & Compaction
    (async () => {
      try {
        await compactIfNecessary(userId, openai);
      } catch (e) {
        console.error("❌ Background compaction failed:", e);
      }
    })();

    process.stdout.write(`✅ Success (${iterations} iterations)\n`);
    return { text: finalText, voiceFiles };
  }

  return { text: "⚠️ Loop limit exceeded.", voiceFiles: [] };
}

