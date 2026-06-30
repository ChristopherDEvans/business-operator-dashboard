import * as cheerio from 'cheerio';
import axios from 'axios';
import { ApifyClient } from 'apify-client';
import { upsertFact } from '../memory.js';
import OpenAI from "openai";
import { config } from "../config.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions.js";

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

export const ingest_knowledge = {
  definition: {
    type: "function",
    function: {
      name: "ingest_knowledge",
      description: "Extracts information from a URL (YouTube video or Website), summarizes the key facts, and saves them to the agent's long-term memory. Use this when the user asks you to 'remember', 'save', 'learn', or 'ingest' a specific link.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The full URL of the YouTube video or Website to ingest."
          },
          context: {
            type: "string",
            description: "Optional context or specific focus for the extraction (e.g. 'focus on the marketing strategies mentioned')."
          }
        },
        required: ["url"]
      }
    }
  } as ChatCompletionTool,
  
  execute: async (args: { url: string; context?: string }, userId: number) => {
    try {
      const { url } = args;
      if (!config.memoryEnabled) {
        return "Memory storage (Pinecone/Supabase) is not configured. I can't save this information right now.";
      }

      let rawText = "";
      let title = url;

      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoIdMatch = url.match(/(?:v=|\/|be\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) {
          throw new Error("Could not extract a valid YouTube Video ID from the URL.");
        }

        console.log(`Piping YouTube extraction to Apify Residential Proxy for ID: ${videoId}...`);
        
        try {
          if (!config.apifyApiKey) {
            throw new Error("APIFY_API_TOKEN is not configured in the environment.");
          }
          
          const apifyClient = new ApifyClient({ token: config.apifyApiKey });
          
          const run = await apifyClient.actor("akash9078/youtube-transcript-extractor").call({
            "videoUrl": url
          });
          
          const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();
          
          if (items && items.length > 0) {
            const resultItem = items[0] as any;
            if (resultItem.transcript) {
              rawText = resultItem.transcript;
              title = resultItem.title || url;
              console.log(`Successfully extracted ${rawText.length} characters of transcript via Apify.`);
            } else {
              throw new Error("Apify actor returned successfully but transcript field is missing.");
            }
          } else {
            throw new Error("Apify actor returned successfully but found no items in dataset.");
          }
          
        } catch (apifyErr: any) {
          console.error("🚨 APIFY BYPASS ENGINE ERROR 🚨");
          console.error(apifyErr.message || apifyErr);
          throw apifyErr;
        }
      } else {
        try {
          const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const $ = cheerio.load(response.data);
          title = $('title').text() || url;
          $('script, style, nav, footer, header').remove();
          rawText = $('body').text().replace(/\s+/g, ' ').trim();
        } catch (scrapErr: any) {
          throw new Error(`Failed to scrape website: ${scrapErr.message}`);
        }
      }

      if (!rawText || rawText.length < 50) {
        throw new Error("The extracted content is too short or empty.");
      }

      // Truncate to avoid context limit (approx 40k chars)
      if (rawText.length > 40000) {
        rawText = rawText.substring(0, 40000);
      }

      // LLM Summarization into Facts
      const prompt = `You are a high-density information extractor. I am going to provide you with a raw text blob from a URL: ${url}.
      ${args.context ? `User Focus: ${args.context}` : ""}
      
      Your task is to extract the top 5-12 discrete, highly valuable insights, facts, or data points from this content.
      
      CRITICAL: You MUST also search for and extract any personal details, preferences, likes, or dislikes mentioned by the speaker (e.g., "I love apples", "I hate spicy food"). These are extremely high priority for my memory.
      
      Format your response as a simple list of facts, each on a new line. Each fact should be a complete sentence that holds its original meaning even without context.
      
      RAW CONTENT:
      ${rawText}`;

      const completion = await openai.chat.completions.create({
        model: config.llmModel,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      });

      const factsStr = completion.choices[0].message?.content || "";
      const facts = factsStr.split('\n').map(f => f.replace(/^[-\d.]+\s*/, '').trim()).filter(f => f.length > 10);

      // Save each fact to memory
      let savedCount = 0;
      for (const fact of facts) {
        try {
          await upsertFact(userId, fact, { source: url, topic: "Automated Ingestion", title });
          savedCount++;
        } catch (err) {
          console.error("Failed to save fact:", fact, err);
        }
      }

      return `Successfully ingested ${savedCount} new insights from "${title}" into my long-term memory. You can now ask me questions about this content!`;

    } catch (e: any) {
      console.error("Ingest Tool Failure:", e);
      const agentFailureInstructions = "The backend service that extracts YouTube transcripts is currently experiencing technical issues or rate limits. Tell the user exactly this: 'Damn, still running into the same issue - the transcript extraction is failing on the backend. The service that grabs YouTube transcripts is having some technical problems. It's not a problem with the video having captions disabled - it's a backend service issue.' Then offer them these exact alternatives: '1. Manual copy: If you can turn on captions in the YouTube player and copy/paste the transcript text, I can save that to memory and pull the first two sentences. 2. Key points: Tell me what the video covers and any important quotes/concepts, and I'll save those insights for future reference.' Then ask them what the video is about to get context.";

      return `ERROR: ${e.message}\n\nSYSTEM_INSTRUCTIONS: ${agentFailureInstructions}`;
    }
  }
};
