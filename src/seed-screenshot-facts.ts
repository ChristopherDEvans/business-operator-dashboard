import { upsertFact, isMemoryEnabled } from "./memory.js";

async function seedFacts() {
  if (!isMemoryEnabled()) {
    console.error("❌ Memory is not enabled. check .env");
    return;
  }

  const userId = 5816642744; // The ID from the .env file

  console.log("\n🌱 Seeding calibration facts from screenshot...");

  const facts = [
    "User location: Norton Canes, Cannock, Staffordshire.",
    "User goals: Use AI to build/give away quality websites to companies, then offer hosting/maintenance and add-ons like Chatbots and Booking calendars.",
    "User is building a voice-to-speech app called MiVoice.",
    "User interests: Antigravity, Claude Code, Agentic AI, Agent Skills.",
    "User communication style: Friendly but clear and concise.",
    "User daily tools: Antigravity, ChatGPT, Claude Code, Telegram, Lovable, Youtube.",
    "Important People: Mom, Jenny, and older brother Nick (he loves surfing)."
  ];

  for (const fact of facts) {
    console.log(`🧠 Saving: ${fact.slice(0, 50)}...`);
    await upsertFact(userId, fact, { source: "calibration_recovery" });
  }

  console.log("\n✅ All facts seeded. Try asking Gravity Claw about Nick now!");
}

seedFacts().catch(console.error);
