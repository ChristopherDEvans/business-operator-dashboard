import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyiatnquuaoruajlwtdw.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5aWF0bnF1dWFvcnVhamx3dGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMTE2ODAsImV4cCI6MjA4OTc4NzY4MH0.C5XYk9zbSCRbgICsn2UCSI-YZClCMbKY8xMArH_GheM';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

export const log_weight = {
  definition: {
    type: 'function' as const,
    function: {
      name: 'log_weight',
      description: 'Log a new body weight measurement for the user. Call this whenever the user states their weight or asks you to track their weight today.',
      parameters: {
        type: 'object',
      properties: {
        weight: {
          type: 'number',
          description: 'The body weight value to log (e.g. 185, 80.5, etc)'
        },
        date: {
          type: 'string',
          description: 'The date for the measurement in YYYY-MM-DD format. Default to today if not provided.'
        }
      },
      required: ['weight']
    }
  }
  },
  execute: async (args: { weight: number; date?: string }) => {
    try {
      const targetDate = args.date || new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('weight_logs')
        .upsert({ date: targetDate, weight: args.weight })
        .select()
        .single();
        
      if (error) {
        console.error("Failed to log weight:", error);
        return `Failed to log weight to the database: ${error.message}`;
      }
      
      // Also log this internally to the activity feed
      await supabase.from('activity_log').insert({
        type: 'tool',
        title: 'Logged Weight',
        description: `Logged body weight of ${args.weight} for date ${targetDate}`
      });

      return `Successfully logged weight of ${args.weight} on ${targetDate}.`;
    } catch (e: any) {
      return `Error logging weight: ${e.message}`;
    }
  }
};
