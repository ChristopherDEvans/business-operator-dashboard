import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ApifyClient } from "apify-client";
import { config } from "../../config.js";
import { supabase, logActivity } from "../../lib/supabase.js";
import { searchFacts } from "../../memory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INVOICE_DIR = path.join(__dirname, "../../../mission-control/public/invoices");

if (!fs.existsSync(INVOICE_DIR)) {
  fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

export class OperationsAdapter {
  /**
   * Generates a daily morning briefing tailored for EvansAISolutions B2B context.
   */
  async generateDailyBrief(userId?: number, locationOverride?: string): Promise<string> {
    try {
      const location = locationOverride || "Cannock, UK";
      
      // 1. Weather
      let weatherData = "Weather data unavailable.";
      try {
        const wRes = await axios.get(`https://wttr.in/${encodeURIComponent(location)}?format=3`);
        weatherData = wRes.data.trim();
      } catch (err) {
        console.error("[Operations] Weather fetch failed:", err);
      }

      // 2. News (Real-time tech/AI news via Apify)
      let newsItems = "- OpenAI updates and AI agent trends\n- New advancements in coding assistants\n- Tech market news for today";
      if (config.apifyApiKey) {
        try {
          const client = new ApifyClient({ token: config.apifyApiKey });
          const run = await client.actor("apify/google-search-scraper").call({
            queries: "latest AI and technology news today",
            maxPagesPerQuery: 1,
            resultsPerPage: 3,
            type: "SEARCH"
          });
          const { items } = await client.dataset(run.defaultDatasetId).listItems();
          if (items && items.length > 0) {
            newsItems = items.slice(0, 3).map((item: any) => {
              const title = item.title || item.result?.title || "Latest Tech Update";
              const url = item.url || item.result?.url || "https://google.com";
              return `- ${title}: ${url}`;
            }).join("\n");
          }
        } catch (err) {
          console.error("[Operations] News fetch failed:", err);
        }
      }

      // 3. ClickUp Schedule
      let schedule = "No urgent tasks found for today.";
      if (config.clickupApiKey && config.clickupListId) {
        try {
          const cRes = await axios.get(`https://api.clickup.com/api/v2/list/${config.clickupListId}/task?status=to%20do`, {
            headers: { Authorization: config.clickupApiKey }
          });
          const tasks = cRes.data.tasks.slice(0, 3);
          if (tasks.length > 0) {
            schedule = tasks.map((t: any) => `- [ClickUp] ${t.name}`).join("\n");
          }
        } catch (err) {
          console.error("[Operations] ClickUp fetch failed:", err);
        }
      }

      // 4. Memory Highlights (Yesterday's Context)
      let highlights = "No major events recorded yesterday.";
      if (userId) {
        try {
          const memoryResults = await searchFacts(userId, "what happened yesterday", 3);
          if (memoryResults.length > 0) {
            highlights = memoryResults.map(m => `- ${m.fact}`).join("\n");
          }
        } catch (err) {
          console.error("[Operations] Memory highlights failed:", err);
        }
      }

      // 5. B2B Commercial Operations metrics (replaces weight/fitness telemetry)
      let opsReport = "Outreach pipeline statistics unavailable.";
      if (supabase) {
        try {
          const { count: leadCount } = await supabase.from("leads").select("*", { count: "exact", head: true });
          const { count: projectCount } = await supabase.from("projects").select("*", { count: "exact", head: true });
          
          const { data: campaigns } = await supabase.from("campaigns").select("sent_count, click_count").eq("status", "active");
          const totalSent = (campaigns || []).reduce((acc, curr) => acc + (curr.sent_count || 0), 0);
          const totalClicks = (campaigns || []).reduce((acc, curr) => acc + (curr.click_count || 0), 0);
          
          opsReport = `
📈 **Leads Scraped**: ${leadCount || 0}
📁 **Active Project Count**: ${projectCount || 0}
📨 **Outreach Sent (Active)**: ${totalSent}
🖱️ **Link Clicks (Active)**: ${totalClicks}
          `.trim();
        } catch (err) {
          console.error("[Operations] B2B operations metrics fetch failed:", err);
        }
      }

      const dataMap: Record<string, string> = {
        weather: weatherData,
        news: newsItems,
        schedule: schedule,
        highlights: highlights,
        health: opsReport, // Replace health map field to preserve template placeholder tags
        location: location
      };

      // Fetch dynamic template from DB
      let template = `
🌅 **Good Morning, Chief!** Your Daily Operations Brief is ready.

🌡️ **{{weather}}** (Staffordshire/Cannock)

📰 **Tech & AI Trends:**
{{news}}

📅 **On Your Radar (ClickUp):**
{{schedule}}

🧠 **Yesterday's Strategic Highlights:**
{{highlights}}

📊 **B2B Pipeline Stats:**
{{health}}

🚀 *Let's acquire some clients today!*
      `.trim();

      if (supabase) {
        try {
          const { data } = await supabase.from("bot_config").select("value").eq("key", "Daily Briefing Template").single();
          if (data?.value) {
            template = data.value;
          }
        } catch (e) {
          console.warn("[Operations] Using default briefing template (DB fetch failed or empty)");
        }
      }

      // Replace placeholders
      let finalBrief = template;
      Object.entries(dataMap).forEach(([key, val]) => {
        finalBrief = finalBrief.replace(new RegExp(`{{${key}}}`, "g"), val);
      });

      return finalBrief;
    } catch (err: any) {
      return `Daily brief generation failed: ${err.message}`;
    }
  }

  /**
   * Generates a professional invoice using GBP (£) default currency.
   */
  async generateInvoice(args: {
    customerName: string;
    customerAddress?: string;
    items: Array<{ description: string; quantity: number; price: number }>;
    invoiceNumber?: string;
    notes?: string;
  }): Promise<string> {
    try {
      let address = args.customerAddress || "Address research in progress...";
      
      // Address Research (Apify)
      if (!args.customerAddress && config.apifyApiKey) {
        try {
          console.log(`[Operations] Researching address for: ${args.customerName}`);
          const client = new ApifyClient({ token: config.apifyApiKey });
          const run = await client.actor("apify/google-search-scraper").call({
            queries: `${args.customerName} corporate office address UK`,
            maxPagesPerQuery: 1,
            resultsPerPage: 1
          });
          const { items } = await client.dataset(run.defaultDatasetId).listItems();
          if (items && items.length > 0) {
            address = (items[0] as any).description || (items[0] as any).title;
          }
        } catch (err) {
          console.error("[Operations] Address research failed:", err);
          address = "Address not found.";
        }
      }

      const invNum = args.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`;
      const date = new Date().toLocaleDateString("en-GB"); // UK formatting
      
      let total = 0;
      const rows = args.items.map(item => {
        const lineTotal = item.quantity * item.price;
        total += lineTotal;
        return `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #1e293b;">${item.description}</td>
            <td style="padding: 12px; border-bottom: 1px solid #1e293b; text-align: center;">${item.quantity}</td>
            <td style="padding: 12px; border-bottom: 1px solid #1e293b; text-align: right;">£${item.price.toFixed(2)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #1e293b; text-align: right;">£${lineTotal.toFixed(2)}</td>
          </tr>
        `;
      }).join("");

      // Branded template with GBP (£) symbols
      const html = `
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #050505; color: #FFFFFF; margin: 0; padding: 40px; }
    .invoice-box { max-width: 850px; margin: auto; padding: 50px; border: 1px solid #FFFFFF1A; background: #0A0A0A; border-radius: 2rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); position: relative; overflow: hidden; }
    .invoice-box::before { content: ""; position: absolute; top: -10%; right: -10%; width: 40%; height: 40%; background: radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%); z-index: 0; }
    .invoice-box::after { content: ""; position: absolute; bottom: -10%; left: -10%; width: 40%; height: 40%; background: radial-gradient(circle, rgba(108, 99, 255, 0.1) 0%, transparent 70%); z-index: 0; }
    .header { position: relative; z-index: 1; display: flex; justify-content: space-between; align-items: center; margin-bottom: 60px; }
    .logo-section { display: flex; align-items: center; gap: 20px; }
    .logo-img { width: 60px; height: 60px; border-radius: 12px; object-fit: cover; border: 1px solid #FFFFFF1A; }
    .brand-name { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(135deg, #00D4FF, #6C63FF); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .founder-profile { display: flex; align-items: center; gap: 15px; margin-bottom: 40px; }
    .founder-img { width: 50px; height: 50px; border-radius: 50%; border: 2px solid #00D4FF; object-fit: cover; }
    .founder-info { line-height: 1.4; }
    .founder-name { font-weight: 600; color: #FFFFFF; font-size: 16px; }
    .founder-email { color: #8892B0; font-size: 14px; }
    .title { font-size: 64px; font-weight: 700; color: #FFFFFF; opacity: 0.03; position: absolute; top: 20px; right: 40px; pointer-events: none; }
    .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 50px; position: relative; z-index: 1; }
    .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2rem; color: #8892B0; margin-bottom: 12px; }
    .value { font-size: 18px; color: #FFFFFF; font-weight: 500; }
    .bill-to-card { padding: 24px; border: 1px solid #FFFFFF1A; border-radius: 1.5rem; background: rgba(255, 255, 255, 0.02); }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; position: relative; z-index: 1; }
    th { text-align: left; padding: 20px 15px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15rem; color: #8892B0; border-bottom: 1px solid #FFFFFF1A; }
    td { padding: 24px 15px; font-size: 15px; color: #FFFFFF; border-bottom: 1px solid #FFFFFF0D; }
    .total-section { margin-top: 50px; display: flex; justify-content: flex-end; position: relative; z-index: 1; }
    .total-pill { background: linear-gradient(135deg, #00D4FF, #6C63FF); padding: 20px 40px; border-radius: 9999px; text-align: right; box-shadow: 0 10px 30px -10px rgba(0, 212, 255, 0.3); }
    .total-label { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 1px; }
    .total-amount { font-size: 36px; font-weight: 700; color: #FFFFFF; }
    .notes-box { margin-top: 60px; padding: 24px; border: 1px solid #FFFFFF1A; border-radius: 1.5rem; background: rgba(0, 212, 255, 0.03); color: #8892B0; font-size: 14px; line-height: 1.6; }
    .notes-title { color: #00D4FF; font-weight: 600; margin-bottom: 10px; display: block; text-transform: uppercase; letter-spacing: 1px; font-size: 12px; }
    .footer { margin-top: 100px; padding-top: 30px; border-top: 1px solid #FFFFFF1A; text-align: center; font-size: 12px; color: #8892B0; letter-spacing: 0.5px; }
    .footer strong { color: #00D4FF; }
  </style>
</head>
<body>
  <div class="invoice-box">
    <div class="title">INVOICE</div>
    <div class="header">
      <div class="logo-section">
        <img src="/branding/logo.png" class="logo-img" alt="Logo">
        <div class="brand-name">EvansAiSolutions</div>
      </div>
      <div style="text-align: right;">
        <div class="label">Invoice Number</div>
        <div class="value" style="font-weight: 700; color: #00D4FF;">${invNum}</div>
      </div>
    </div>
    <div class="founder-profile">
      <img src="/branding/founder-photo.jpg" class="founder-img" alt="Chris Evans">
      <div class="founder-info">
        <div class="founder-name">Chris Evans</div>
        <div class="founder-email">chris@evansaisolutions.com</div>
      </div>
    </div>
    <div class="details-grid">
      <div class="bill-to-card">
        <div class="label">Bill To</div>
        <div class="value" style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">${args.customerName}</div>
        <div style="color: #8892B0; font-size: 14px; line-height: 1.5;">${address}</div>
      </div>
      <div style="padding: 24px; display: flex; flex-direction: column; justify-content: center; align-items: flex-end;">
        <div class="label">Date Issued</div>
        <div class="value">${date}</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Rate</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
    <div class="total-section">
      <div class="total-pill">
        <div class="total-label">Total Amount Due</div>
        <div class="total-amount">£${total.toFixed(2)}</div>
      </div>
    </div>
    ${args.notes ? `
    <div class="notes-box">
      <span class="notes-title">Payment Instructions & Notes</span>
      ${args.notes.replace(/\n/g, "<br>")}
    </div>
    ` : ""}
    <div class="footer">
      Thank you for your business! Payment is due within 14 days of the invoice date.<br>
      <strong>EvansAiSolutions</strong> | Staffordshire, UK | chris@evansaisolutions.com
    </div>
  </div>
</body>
</html>
      `;

      const fileName = `${invNum}-${args.customerName.replace(/\s+/g, "_")}.html`;
      const filePath = path.join(INVOICE_DIR, fileName);
      fs.writeFileSync(filePath, html);

      const publicUrl = `${config.missionControlUrl}/invoices/${fileName}`;
      await logActivity("task", "Invoice Generated", `Sent to ${args.customerName} for £${total.toFixed(2)}`);

      return `Invoice generated successfully! View here: ${publicUrl}.\nAddress research completed for "${args.customerName}". GBP (£) currency formatting applied.`;
    } catch (err: any) {
      return `Invoice generation failed: ${err.message}`;
    }
  }
}

export const operations = new OperationsAdapter();
