import OpenAI from "openai";
import { config } from "../config.js";

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1", // Using existing OpenRouter setup
  defaultHeaders: {
    "HTTP-Referer": "https://github.com/gravity-claw",
    "X-Title": "Gravity Claw",
  },
});

let embeddingQuotaWarned = false;

export async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    const response = await openai.embeddings.create({
      model: config.embeddingModel || "openai/text-embedding-3-small",
      input: text.replace(/\n/g, " "),
    });

    return response.data[0].embedding;
  } catch (error: any) {
    if (error.status === 403 || error.message?.includes("limit exceeded")) {
      if (!embeddingQuotaWarned) {
        console.warn("⚠️ Embedding quota reached. Semantic search disabled (Memory T2).");
        embeddingQuotaWarned = true;
      }
      return null;
    }
    console.error("❌ Embedding error:", error.message);
    return null;
  }
}
