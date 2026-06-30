import { Bot, InputFile } from "grammy";
import { config } from "./config.js";
import { runAgentLoop } from "./agent.js";
import { transcribeVoice } from "./voice.js";
import { cleanupTTS } from "./tts.js";
import { handleOnboarding, isInOnboarding } from "./onboarding.js";
import { setActiveModel, getActiveModel } from "./agent.js";
import { usageTracker } from "./lib/usage.js";

// ── Create bot ─────────────────────────────────────────
export const bot = new Bot(config.telegramBotToken);

// ── Security: User ID whitelist ────────────────────────
bot.use(async (ctx, next) => {
  const userId = ctx.from?.id;

  // Silently ignore messages from unknown users
  if (!userId || !config.allowedUserIds.includes(userId)) {
    return; // 🔒 Silent drop — no response, no error, no log
  }

  await next();
});

// ── Handle text messages ───────────────────────────────
bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;

  console.log(`\n💬 [User ${userId}]: ${text.slice(0, 100)}${text.length > 100 ? "…" : ""}`);
  console.log(`✅ Config loaded — ${config.allowedUserIds.length} allowed user(s), model: ${config.llmModel}, voice: ${config.voiceEnabled ? "ENABLED" : "DISABLED"}, memory: ${config.memoryEnabled ? "ENABLED" : "DISABLED"}`);
if (config.memoryEnabled) {
  console.log(`📡 Memory Config: Index=${config.pineconeIndex}, User=${config.userId}`);
}

  // 1. Check for Onboarding Flow
  if (text.startsWith("/setup") || isInOnboarding(userId)) {
    const onboardingResponse = await handleOnboarding(userId, text);
    if (onboardingResponse) {
      await ctx.reply(onboardingResponse);
      return;
    }
  }

  // 1.1 Handle /model command
  if (text.startsWith("/model")) {
    const parts = text.split(" ");
    if (parts.length === 1) {
      const current = getActiveModel(userId);
      await ctx.reply(`🤖 *Current Model:* \`${current}\`\n\n*Available Prefixes:*\n- \`anthropic/\` (Claude)\n- \`google/\` (Gemini)\n- \`groq/\` (Llama/Mixtral)\n- \`deepseek/\` (DeepSeek)\n- \`local/\` (Ollama)\n- Any OpenRouter model ID\n\nTo switch, type: \`/model <model_id>\``, { parse_mode: "Markdown" });
      return;
    }
    const newModel = parts[1];
    setActiveModel(userId, newModel);
    await ctx.reply(`✅ Model switched to: \`${newModel}\``, { parse_mode: "Markdown" });
    return;
  }

  // 1.2 Handle /usage command
  if (text.startsWith("/usage")) {
    const stats = usageTracker.getSummary(userId);
    const daily = usageTracker.getDailyStats(userId);
    
    let msg = `📊 *Usage Statistics (All Time)*\n\n`;
    msg += `📞 *Total Calls:* \`${stats.totalCalls}\`\n`;
    msg += `🪙 *Total Tokens:* \`${stats.totalTokens?.toLocaleString() || 0}\`\n`;
    msg += `💰 *Est. Cost:* \`$${stats.totalCost?.toFixed(4) || "0.0000"}\`\n`;
    msg += `⚡ *Avg Latency:* \`${stats.avgLatency?.toFixed(0) || 0}ms\`\n\n`;
    
    if (daily.length > 0) {
      msg += `📈 *Last 7 Days:*\n`;
      daily.forEach(d => {
        msg += `- \`${d.day}\`: \`${d.totalTokens?.toLocaleString() || 0}\` tokens ($${d.totalCost?.toFixed(4) || "0.0000"})\n`;
      });
    }

    await ctx.reply(msg, { parse_mode: "Markdown" });
    return;
  }

  try {
    const { text: responseText, voiceFiles } = await withTyping(ctx, () => runAgentLoop(userId, text));
    await sendAgentResponse(ctx, responseText, voiceFiles);
  } catch (error) {
    console.error("❌ Agent error:", error);
    await ctx.reply("⚠️ Something went wrong. Check the logs for details.");
  }
});

// ── Handle voice messages ──────────────────────────────
bot.on("message:voice", async (ctx) => {
  const userId = ctx.from.id;

  // Check if voice transcription is configured
  if (!config.voiceEnabled) {
    await ctx.reply("🎙️ Voice isn't set up yet — add a WHISPER_API_KEY to .env (Groq is free!)");
    return;
  }

  console.log(`\n🎙️ [User ${userId}]: Voice message (${ctx.message.voice.duration}s)`);
  await ctx.replyWithChatAction("typing");

  try {
    // Get the voice file URL from Telegram
    const file = await ctx.getFile();
    const fileUrl = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;

    // Transcribe the voice message
    const transcription = await transcribeVoice(fileUrl);

    if (!transcription) {
      await ctx.reply("🎙️ I couldn't make out what you said. Could you try again?");
      return;
    }

    // Echo back what they said
    await ctx.reply(`🎤 *You said:*\n_"${transcription}"_`, { parse_mode: "Markdown" }).catch(async () => {
      await ctx.reply(`🎤 You said:\n"${transcription}"`);
    });

    // Pass the transcription to the agent loop for a reply
    const { text: responseText, voiceFiles } = await withTyping(ctx, () => runAgentLoop(userId, transcription));
    await sendAgentResponse(ctx, responseText, voiceFiles);
  } catch (error) {
    console.error("❌ Voice error:", error);
    await ctx.reply("⚠️ Failed to process voice message. Check the logs.");
  }
});

// ── Handle other messages ──────────────────────────────
bot.on("message", async (ctx) => {
  if (!ctx.message.text && !ctx.message.voice) {
    await ctx.reply("📝 I handle text and voice messages. Other formats coming soon!");
  }
});

/**
 * Sends the agent's response (text + any generated voice files).
 */
async function sendAgentResponse(ctx: any, text: string, voiceFiles: string[]) {
  // Send text response first (using existing logic)
  if (text && text !== "(No response)") {
    await sendText(ctx, text);
  }

  // Send any generated voice files
  for (const filePath of voiceFiles) {
    console.log(`  🔊 Sending voice reply: ${filePath}`);
    await ctx.replyWithChatAction("upload_voice");
    await ctx.replyWithVoice(new InputFile(filePath));
  }

  // Periodic cleanup of old TTS files
  cleanupTTS();
}

/**
 * Utility: send text, handling length limits and markdown.
 */
async function sendText(ctx: any, text: string) {
  if (text.length <= 4096) {
    await ctx.reply(text, { parse_mode: "Markdown" }).catch(async () => {
      await ctx.reply(text);
    });
  } else {
    const chunks = splitMessage(text, 4096);
    for (const chunk of chunks) {
      await ctx.reply(chunk, { parse_mode: "Markdown" }).catch(async () => {
        await ctx.reply(chunk);
      });
    }
  }
}

/**
 * Utility: split long messages.
 */
function splitMessage(text: string, maxLength: number): string[] {
  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("\n", maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = remaining.lastIndexOf(" ", maxLength);
    }
    if (splitIndex === -1) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex).trimStart();
  }

  return chunks;
}

/**
 * Utility: Keep typing indicator alive during a long task
 */
async function withTyping<T>(ctx: any, task: () => Promise<T>): Promise<T> {
  await ctx.replyWithChatAction("typing");
  const interval = setInterval(() => {
    ctx.replyWithChatAction("typing").catch(() => {});
  }, 4000);

  try {
    return await task();
  } finally {
    clearInterval(interval);
  }
}
