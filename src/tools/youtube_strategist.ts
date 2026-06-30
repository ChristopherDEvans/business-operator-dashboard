import { ApifyClient } from 'apify-client';
import { config } from '../config.js';
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

/**
 * ── Tool: youtube_strategist ───────────────────────────
 */
export const youtube_strategist = {
  definition: {
    type: 'function' as const,
    function: {
      name: 'youtube_strategist',
      description: 'Act as a YouTube strategist. Generate viral video titles, research trends, or fetch thumbnails.',
      parameters: {
        type: 'object',
        properties: {
          action: { 
            type: 'string', 
            enum: ['generate_titles', 'research_trends', 'get_thumbnail'],
            description: 'The strategy action to perform.'
          },
          topic: { type: 'string', description: 'The topic or niche to research.' },
          url: { type: 'string', description: 'YouTube video URL (for thumbnails).' }
        },
        required: ['action']
      }
    }
  },
  execute: async (args: { action: string; topic?: string; url?: string }) => {
    const { action, topic, url } = args;

    try {
      if (action === 'generate_titles') {
        if (!topic) return "Please provide a topic for title generation.";
        
        const prompt = `You are a world-class YouTube strategist for a tech/AI channel. 
        Generate 5 viral, high-click-through-rate (CTR) video titles for this topic: "${topic}". 
        Make them catchy but not clickbaity. Focus on value and intrigue.`;

        const completion = await openai.chat.completions.create({
          model: config.llmModel,
          messages: [{ role: "user", content: prompt }],
        });

        return `🎬 **Suggested Video Titles for "${topic}":**\n\n${completion.choices[0].message.content}`;
      }

      if (action === 'research_trends') {
        if (!config.apifyApiKey) return "Trend research requires an Apify API key.";
        
        const client = new ApifyClient({ token: config.apifyApiKey });
        const run = await client.actor("apify/google-search-scraper").call({
          queries: `${topic || 'AI agents'} trends YouTube 2024 2025`,
          maxPagesPerQuery: 1,
          resultsPerPage: 5
        });

        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        const trends = items.map((item: any) => `- ${item.title}: ${item.url}`).join('\n');

        return `📉 **Latest Trending Topics in ${topic || 'AI'}:**\n\n${trends}`;
      }

      if (action === 'get_thumbnail') {
        if (!url) return "Please provide a YouTube URL.";
        const videoIdMatch = url.match(/(?:v=|\/|be\/)([\w-]{11})/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) return "Invalid YouTube URL.";

        const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        return `🖼️ **Video Thumbnail:**\n\n${thumbnail}\n\n(Note: Max resolution might not exist for all videos)`;
      }

      return "Unknown action.";
    } catch (err: any) {
      return `Strategist failed: ${err.message}`;
    }
  }
};
