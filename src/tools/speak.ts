import { generateTTS } from "../tts.js";
import { config } from "../config.js";

// ── Tool definition ────────────────────────────────────
export const definition = {
  type: "function" as const,
  function: {
    name: "speak",
    description:
      "Generates a voice message from text and sends it to the user. Use this when the user asks you to speak, send a voice note, or when a voice response feels more natural/requested.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "The text to convert to speech.",
        },
        final_response: {
          type: "boolean",
          description: "Whether this is the final response to the user. Defaults to true. Set to false if you need to perform more actions/calls after speaking.",
        },
      },
      required: ["text"],
    },
  },
};

// ── Tool handler ───────────────────────────────────────
/**
 * Generates an audio file and returns the path.
 * The bot layer will detect this path and send it as a voice message.
 */
export async function execute(input: { text: string; final_response?: boolean }): Promise<string> {
  if (!config.ttsEnabled) {
    return JSON.stringify({
      error: "Text-to-speech is not configured (missing ElevenLabs API key).",
    });
  }

  try {
    const filePath = await generateTTS(input.text);
    return JSON.stringify({
      success: true,
      message: "Voice message generated and will be sent.",
      voiceFilePath: filePath,
      final_response: input.final_response !== false,
    });
  } catch (error: any) {
    console.error("❌ TTS error:", error);
    return JSON.stringify({
      error: `Failed to generate voice: ${error.message}`,
    });
  }
}

