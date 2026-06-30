import { upsertFact } from "./memory.js";

// ── Onboarding Questions ────────────────────────────────
export const ONBOARDING_QUESTIONS = [
  "1. 👤 What's your name?",
  "2. 🛠️ What do you do? (Occupation/Skills)",
  "3. 📍 Where are you based?",
  "4. 🚀 What are your current goals or projects?",
  "5. 📚 What topics or technologies are you into?",
  "6. 💬 How do you like to communicate? (Tone, frequency, etc.)",
  "7. 🔧 What tools do you use daily?",
  "8. 👥 Who are some important people for me to know about?"
];

// Simple in-memory state for onboarding
// In a production app, this would be in a database/session
const onboardingState = new Map<number, { step: number }>();

/**
 * Start or continue the onboarding process.
 */
export async function handleOnboarding(userId: number, text: string): Promise<string | null> {
  const lowerText = text.toLowerCase().trim();

  // 1. Initial trigger
  if (lowerText === "/setup") {
    onboardingState.set(userId, { step: 0 });
    return `👋 Let's get Gravity Claw calibrated for you! I'll ask 8 quick questions. Type "skip" to skip any, or "/cancel" to stop.\n\n${ONBOARDING_QUESTIONS[0]}`;
  }

  const state = onboardingState.get(userId);
  if (!state) return null;

  // 2. Handle cancel
  if (lowerText === "/cancel") {
    onboardingState.delete(userId);
    return "❌ Onboarding cancelled. You can restart any time with /setup.";
  }

  // 3. Process the answer to the current question
  const currentStep = state.step;
  if (lowerText !== "skip") {
    const question = ONBOARDING_QUESTIONS[currentStep];
    const fact = `User answered "${question}": ${text}`;
    
    // Save to Tier 3: Core Memory
    // We fire and forget this for responsiveness
    upsertFact(userId, fact, { category: "onboarding", step: currentStep });
    console.log(`🧠 [Onboarding]: Saved step ${currentStep} for user ${userId}`);
  }

  // 4. Move to next question
  const nextStep = currentStep + 1;
  if (nextStep < ONBOARDING_QUESTIONS.length) {
    onboardingState.set(userId, { step: nextStep });
    return ONBOARDING_QUESTIONS[nextStep];
  } else {
    // 5. Completion
    onboardingState.delete(userId);
    return "✅ Calibration complete! I now have a solid core memory of who you are. We can always update this if things change. How can I help you today? 🦀";
  }
}

/**
 * Check if a user is currently in the onboarding flow.
 */
export function isInOnboarding(userId: number): boolean {
  return onboardingState.has(userId);
}
