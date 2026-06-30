import { saveReminderLocal } from "../lib/db.js";

/**
 * ── Tool: set_reminder ─────────────────────────────────
 */
export const set_reminder = {
  definition: {
    type: 'function' as const,
    function: {
      name: 'set_reminder',
      description: 'Set a reminder for the user to be delivered after a specified time. Use this when the user says "remind me in X minutes to do Y".',
      parameters: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'The reminder message.' },
          minutes: { type: 'integer', description: 'Number of minutes from now to fire the reminder.' },
          hours: { type: 'integer', description: 'Optional hours from now.' }
        },
        required: ['message']
      }
    }
  },
  execute: async (args: { message: string; minutes?: number; hours?: number }, userId: number) => {
    try {
      const { message, minutes = 0, hours = 0 } = args;
      
      if (minutes === 0 && hours === 0) {
        return "Please specify a time for the reminder (e.g., 5 minutes).";
      }

      const dueAt = new Date();
      dueAt.setMinutes(dueAt.getMinutes() + minutes);
      dueAt.setHours(dueAt.getHours() + hours);
      
      const dueAtStr = dueAt.toISOString();
      saveReminderLocal(userId, message, dueAtStr);
      
      const timeStr = [
        hours > 0 ? `${hours} hour(s)` : null,
        minutes > 0 ? `${minutes} minute(s)` : null
      ].filter(Boolean).join(' and ');

      return `Got it! I'll remind you to "${message}" in ${timeStr}.`;
    } catch (err: any) {
      return `Failed to set reminder: ${err.message}`;
    }
  }
};
