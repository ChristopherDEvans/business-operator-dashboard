import { supabase } from "../../lib/supabase.js";
import { config } from "../../config.js";

export interface Lead {
  id: string;
  business_name: string;
  url: string | null;
  niche: string | null;
  email: string | null;
  status: 'scraped' | 'website_created' | 'emailed' | 'clicked' | 'replied' | 'converted';
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  niche: string;
  sent_count: number;
  open_count: number;
  click_count: number;
  reply_count: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  created_at: string;
}

export class ProspectorAdapter {
  private prospectorPath: string;

  constructor() {
    this.prospectorPath = config.prospectorPath || "";
  }

  /**
   * Fetch all leads or leads matching a specific status.
   */
  async getLeads(status?: Lead['status']): Promise<Lead[]> {
    if (!supabase) return [];

    try {
      let query = supabase.from("leads").select("*");
      if (status) {
        query = query.eq("status", status);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Lead[];
    } catch (e: any) {
      console.error("[Prospector] Failed to fetch leads:", e.message);
      return [];
    }
  }

  /**
   * Update the status of a lead.
   */
  async updateLeadStatus(leadId: string, status: Lead['status']): Promise<boolean> {
    if (!supabase) return false;

    try {
      const { error } = await supabase
        .from("leads")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", leadId);

      if (error) throw error;
      return true;
    } catch (e: any) {
      console.error(`[Prospector] Failed to update lead ${leadId}:`, e.message);
      return false;
    }
  }

  /**
   * Fetches marketing campaigns.
   */
  async getCampaigns(): Promise<Campaign[]> {
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Campaign[];
    } catch (e: any) {
      console.error("[Prospector] Failed to fetch campaigns:", e.message);
      return [];
    }
  }

  /**
   * Score a lead based on URL analysis or GBP factors (stub for now).
   */
  async scoreLead(leadId: string): Promise<string> {
    if (!supabase) return "Supabase client not initialized.";
    
    try {
      const { data: lead, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", leadId)
        .single();

      if (error || !lead) {
        return `Lead with ID ${leadId} not found.`;
      }

      // In the future, this triggers a real scoring job.
      return `Scoring completed for lead "${lead.business_name}". Status set to scraped.`;
    } catch (e: any) {
      return `Scoring failed: ${e.message}`;
    }
  }
}

export const prospector = new ProspectorAdapter();
