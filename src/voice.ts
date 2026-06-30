import OpenAI from "openai";
import { config } from "./config.js";

// ── Groq Whisper client (free, fast transcription) ─────
let whisperClient: OpenAI | null = null;

function getWhisperClient(): OpenAI {
  if (!whisperClient) {
    whisperClient = new OpenAI({
      baseURL: config.whisperBaseUrl,
      apiKey: config.whisperApiKey,
    });
  }
  return whisperClient;
}

/**
 * Download a file from a URL and return it as a Buffer.
 */
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

/**
 * Transcribe a voice message from Telegram.
 * Downloads the .ogg file from Telegram's servers, sends it to Whisper API.
 */
export async function transcribeVoice(
  fileUrl: string,
): Promise<string> {
  const client = getWhisperClient();

  // Download the voice file from Telegram
  console.log(`  🎙️ Downloading voice file…`);
  const audioBuffer = await downloadFile(fileUrl);

  // Create a File object for the OpenAI SDK
  const audioFile = new File([new Uint8Array(audioBuffer)], "voice.ogg", { type: "audio/ogg" });

  // Send to Whisper for transcription
  console.log(`  🎙️ Transcribing ${(audioBuffer.length / 1024).toFixed(1)} KB of audio…`);
  const transcription = await client.audio.transcriptions.create({
    model: config.whisperModel,
    file: audioFile,
    response_format: "text",
  });

  const text = typeof transcription === "string"
    ? transcription.trim()
    : (transcription as unknown as { text: string }).text?.trim() || "";

  console.log(`  ✅ Transcribed: "${text.slice(0, 100)}${text.length > 100 ? "…" : ""}"`);
  return text;
}
