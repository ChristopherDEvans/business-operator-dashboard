// Tool definition is now in registry.ts (OpenAI format)
// This file only contains the execution logic.

/**
 * Returns the current date/time, optionally in a specific timezone.
 */
export function execute(input: { timezone?: string }): string {
  const tz = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  try {
    const now = new Date();
    const formatted = now.toLocaleString("en-GB", {
      timeZone: tz,
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "long",
    });

    return JSON.stringify({
      formatted,
      iso: now.toISOString(),
      timezone: tz,
      unix: Math.floor(now.getTime() / 1000),
    });
  } catch {
    return JSON.stringify({
      error: `Invalid timezone: "${tz}". Use IANA format like "America/New_York".`,
    });
  }
}
