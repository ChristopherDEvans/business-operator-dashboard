import { ApifyClient } from "apify-client";
import OpenAI from "openai";
import { config } from "../../config.js";

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

export class BusinessIntelligenceAdapter {
  /**
   * Researches trends or topics in a given market/niche using Apify.
   */
  async researchTrends(topic: string): Promise<string> {
    if (!config.apifyApiKey) {
      return "Trend research requires an Apify API key.";
    }

    try {
      const client = new ApifyClient({ token: config.apifyApiKey });
      const run = await client.actor("apify/google-search-scraper").call({
        queries: `${topic} B2B local business trends UK`,
        maxPagesPerQuery: 1,
        resultsPerPage: 5
      });

      const { items } = await client.dataset(run.defaultDatasetId).listItems();
      const trends = items.map((item: any) => `- ${item.title}: ${item.url}`).join("\n");

      return `📈 **Latest Trending Topics in "${topic}" (UK):**\n\n${trends}`;
    } catch (err: any) {
      return `Failed to fetch trends: ${err.message}`;
    }
  }

  /**
   * ── Merged YouTube Strategist Functions (Internal Callable Only) ──
   */

  async executeYoutubeStrategistAction(action: string, topic?: string, url?: string): Promise<string> {
    try {
      if (action === "generate_titles") {
        if (!topic) return "Please provide a topic for title generation.";
        
        const prompt = `You are a YouTube strategist. Generate 5 viral, CTR titles for: "${topic}".`;
        const completion = await openai.chat.completions.create({
          model: config.llmModel,
          messages: [{ role: "user", content: prompt }]
        });

        return `Suggested Titles:\n${completion.choices[0].message.content}`;
      }

      if (action === "research_trends") {
        if (!topic) return "Please provide a topic for YouTube trend research.";
        if (!config.apifyApiKey) return "YouTube trends require an Apify API key.";

        const client = new ApifyClient({ token: config.apifyApiKey });
        const run = await client.actor("apify/google-search-scraper").call({
          queries: `${topic} trends YouTube 2026`,
          maxPagesPerQuery: 1,
          resultsPerPage: 5
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        return items.map((item: any) => `- ${item.title}: ${item.url}`).join("\n");
      }

      if (action === "get_thumbnail") {
        if (!url) return "Please provide a YouTube URL.";
        const videoIdMatch = url.match(/(?:v=|\/|be\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) return "Invalid YouTube URL.";

        return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      }

      return "Unknown strategist action.";
    } catch (err: any) {
      return `YouTube Strategist error: ${err.message}`;
    }
  }
}

export const businessIntelligence = new BusinessIntelligenceAdapter();
