import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

const TMP_DIR = path.resolve(process.cwd(), "tmp");

/**
 * Ensures the tmp directory exists.
 */
function ensureTmpDir() {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }
}

/**
 * Generate audio from text via ElevenLabs.
 * Returns the absolute path to the generated MP3 file.
 */
export async function generateTTS(text: string): Promise<string> {
  if (!config.ttsEnabled) {
    throw new Error("TTS is not enabled (missing ELEVENLABS_API_KEY)");
  }

  ensureTmpDir();

  console.log(`  🔊 Generating TTS for: "${text.slice(0, 50)}..."`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${config.elevenLabsVoiceId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": config.elevenLabsApiKey,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`❌ ElevenLabs API error: ${response.status}`, errorBody);
    throw new Error(`ElevenLabs API error: ${response.status} ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const fileName = `tts_${Date.now()}.mp3`;
  const filePath = path.join(TMP_DIR, fileName);

  fs.writeFileSync(filePath, buffer);

  console.log(`  ✅ TTS generated: ${filePath}`);
  return filePath;
}

/**
 * Clean up old TTS files (older than 1 hour).
 */
export function cleanupTTS() {
  if (!fs.existsSync(TMP_DIR)) return;

  const files = fs.readdirSync(TMP_DIR);
  const now = Date.now();

  for (const file of files) {
    if (file.startsWith("tts_")) {
      const filePath = path.join(TMP_DIR, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtimeMs > 3600000) {
        fs.unlinkSync(filePath);
      }
    }
  }
}
