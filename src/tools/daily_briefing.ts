import { operations } from "../domains/operations/index.js";

export const daily_briefing = {
  definition: {
    type: "function" as const,
    function: {
      name: "daily_briefing",
      description: "Generate a comprehensive daily morning business brief including news, weather, and sales/campaign updates. Use this for proactive morning accountability.",
      parameters: {
        type: "object",
        properties: {
          location: { type: "string", description: "Location for weather (default: Cannock, UK)" }
        }
      }
    }
  },
  execute: async (args: { location?: string }, userId?: number) => {
    // Delegate to Operations domain
    return await operations.generateDailyBrief(userId, args.location);
  }
};
