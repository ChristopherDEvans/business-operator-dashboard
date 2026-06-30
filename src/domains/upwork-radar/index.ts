import OpenAI from "openai";
import { config } from "../../config.js";

const openai = new OpenAI({
  apiKey: config.openRouterApiKey,
  baseURL: "https://openrouter.ai/api/v1",
});

export interface UpworkJob {
  id: string;
  title: string;
  description: string;
  budget: string;
  posted_at: string;
  score?: number;
  reasoning?: string;
}

export class UpworkRadarAdapter {
  /**
   * Search for Upwork jobs. (Simulated integration for now).
   */
  async searchJobs(query: string): Promise<UpworkJob[]> {
    console.log(`[Upwork Radar] Searching jobs for query: "${query}"`);
    // Future integration with RSS feeds or scraping
    return [
      {
        id: "job-1",
        title: "React Developer for Local Business Website",
        description: "Looking for a developer to build a modern React website for a local garage shop in the UK. Need high performance and clean UI.",
        budget: "£1,000",
        posted_at: new Date().toISOString(),
      }
    ];
  }

  /**
   * Scores a job description from 0 to 100 based on B2B match quality.
   */
  async scoreJob(jobDescription: string): Promise<{ score: number; reasoning: string }> {
    try {
      const prompt = `You are a B2B sales strategist for EvansAiSolutions.
      Score the following Upwork job post from 0 to 100 on how well it fits our agency capabilities (Websites, lead capture, CRM automation, local UK business focus).
      Provide a brief 1-sentence reasoning.
      
      JOB DESCRIPTION:
      "${jobDescription}"
      
      Output JSON format: {"score": 85, "reasoning": "Reason here"}`;

      const completion = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-001", // cost-effective model for scoring
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const resText = completion.choices[0].message?.content || "{}";
      const parsed = JSON.parse(resText);
      return {
        score: parsed.score || 50,
        reasoning: parsed.reasoning || "Could not parse reasoning."
      };
    } catch (e: any) {
      console.error("[Upwork Radar] Scoring failed:", e.message);
      return { score: 0, reasoning: `Scoring failed: ${e.message}` };
    }
  }

  /**
   * Drafts a custom proposal for a job post. Requires Claude 3.5 Sonnet.
   */
  async draftProposal(jobTitle: string, jobDescription: string): Promise<string> {
    try {
      const prompt = `You are Chris Evans, lead consultant at EvansAiSolutions.
      Write a highly personalized, compelling Upwork proposal for the following job:
      Title: "${jobTitle}"
      Description: "${jobDescription}"
      
      Guidelines:
      - Direct, professional, British English spelling and tone.
      - Do NOT use generic AI intro templates ("I write to apply..."). Mention similar local business work.
      - Focus on delivering enquiries and converting leads.
      - Ask 1-2 sharp clarifying questions.
      - Note that all applications require human review (no auto-apply).`;

      const completion = await openai.chat.completions.create({
        model: "anthropic/claude-3.5-sonnet", // flagship model for high-value copy
        messages: [{ role: "user", content: prompt }]
      });

      return completion.choices[0].message?.content || "Could not generate proposal.";
    } catch (e: any) {
      return `Failed to draft proposal: ${e.message}`;
    }
  }
}

export const upworkRadar = new UpworkRadarAdapter();
