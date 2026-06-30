import "dotenv/config"; // Reloaded to pick up new env vars

// ── Required env vars ──────────────────────────────────
const required = [
  "TELEGRAM_BOT_TOKEN",
  "OPENROUTER_API_KEY",
  "ALLOWED_USER_IDS",
] as const;

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing required env var: ${key}`);
    console.error(`   Copy .env.example to .env and fill in your values.`);
    process.exit(1);
  }
}

// ── Parsed config ──────────────────────────────────────
export const config = {
  /** Telegram bot token from @BotFather */
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!,

  /** OpenRouter API key */
  openRouterApiKey: process.env.OPENROUTER_API_KEY!,

  /** Telegram user IDs allowed to use the bot */
  allowedUserIds: process.env.ALLOWED_USER_IDS!
    .split(",")
    .map((id) => Number(id.trim()))
    .filter((id) => !Number.isNaN(id) && id > 0),

  /** Max agent loop iterations (safety limit) */
  maxAgentIterations: Number(process.env.MAX_AGENT_ITERATIONS) || 10,

  /** LLM model to use via OpenRouter/Groq */
  llmModel: process.env.LLM_MODEL || "groq/llama-3.3-70b-versatile",

  /** Whisper transcription API key (Groq is free) */
  whisperApiKey: process.env.WHISPER_API_KEY || "",

  /** Whisper API base URL (defaults to Groq) */
  whisperBaseUrl: process.env.WHISPER_BASE_URL || "https://api.groq.com/openai/v1",

  /** Whisper model (defaults to Groq's fast turbo model) */
  whisperModel: process.env.WHISPER_MODEL || "whisper-large-v3-turbo",

  /** Whether voice transcription is available */
  get voiceEnabled(): boolean {
    return this.whisperApiKey.length > 0;
  },

  /** ElevenLabs API key */
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",

  /** ElevenLabs Voice ID */
  elevenLabsVoiceId: process.env.ELEVENLABS_VOICE_ID || "FGY2WhTYpPnrIDTdsKH5",

  /** Whether TTS is available */
  get ttsEnabled(): boolean {
    return this.elevenLabsApiKey.length > 0;
  },

  /** Pinecone API Key */
  pineconeApiKey: process.env.PINECONE_API_KEY || "",

  /** Pinecone Index (Host or Name) */
  pineconeIndex: process.env.PINECONE_INDEX || "",

  /** Whether Pinecone is configured */
  get memoryEnabled(): boolean {
    return this.pineconeApiKey.length > 0 && this.pineconeIndex.length > 0;
  },

  /** Supabase URL */
  supabaseUrl: process.env.SUPABASE_URL || null,

  /** Supabase Service/Anon Key */
  supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || null,
  
  // ClickUp Configuration
  clickupApiKey: process.env.CLICKUP_API_KEY || null,
  clickupListId: process.env.CLICKUP_LIST_ID || null,

  /** Anthropic API key */
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",

  /** Google API key (Gemini) */
  googleApiKey: process.env.GOOGLE_API_KEY || "",

  /** Groq API key */
  groqApiKey: process.env.GROQ_API_KEY || "",

  /** DeepSeek API key */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",

  /** Local LLM Base URL (e.g. Ollama) */
  localLlmBaseUrl: process.env.LOCAL_LLM_BASE_URL || "http://localhost:11434/v1",

  /** Failover priority list (comma-separated model IDs) */
  llmFailoverPriority: (process.env.LLM_FAILOVER_PRIORITY || "groq/llama-3.3-70b-versatile,groq/llama-3.1-8b-instant,anthropic/claude-3-5-haiku-latest,google/gemini-2.0-flash-001")
    .split(",")
    .map(s => s.trim())
    .filter(s => s.length > 0),

  /** Embedding model to use via OpenRouter/OpenAI */
  embeddingModel: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small",

  /** Dimensions for the chosen embedding model */
  embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1536,

  /** Apify API Token */
  apifyApiKey: process.env.APIFY_API_TOKEN || "",

  /** Primary User ID for memory ownership (string for safety, but parsed if number) */
  userId: process.env.USER_ID || "5816642744",

  /** Mission Control Dashboard URL */
  missionControlUrl: process.env.MISSION_CONTROL_URL || "http://localhost:3000",

  /** LinkedIn OS repository path */
  linkedinOsPath: process.env.LINKEDIN_OS_PATH || "",

  /** Prospector repository/project path */
  prospectorPath: process.env.PROSPECTOR_PATH || "",

  /** Hermes sync endpoint/path */
  hermesSyncPath: process.env.HERMES_SYNC_PATH || "",

  /** Template Vault location */
  templateVaultPath: process.env.TEMPLATE_VAULT_PATH || "",

  /** Generated Sites output location */
  generatedSitesPath: process.env.GENERATED_SITES_PATH || "",
} as const;

// Validate at least one user ID was parsed
if (config.allowedUserIds.length === 0) {
  console.error("❌ ALLOWED_USER_IDS must contain at least one valid numeric Telegram user ID.");
  process.exit(1);
}

console.log(`✅ Config loaded — ${config.allowedUserIds.length} allowed user(s), model: ${config.llmModel}, voice: ${config.voiceEnabled ? "ENABLED" : "DISABLED"}`);
