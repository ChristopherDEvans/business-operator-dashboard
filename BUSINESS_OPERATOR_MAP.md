# EvansAISolutions Business Operator Map

This document maps the capabilities of the evolved Business Operator directly to the core commercial outcomes of **EvansAISolutions** (B2B client acquisition, service delivery, and automation).

---

## Business Mapping Table

| Operator Capability | System Implementation | Target Business Objective | B2B Commercial Outcome |
| :--- | :--- | :--- | :--- |
| **Site Factory Stamper** | `stamp_site.js` & `Website Factory` domain | Websites | Rapidly deploy high-converting React mockups (using premium CodeGrid designs) to pitch and secure local UK businesses. |
| **Physical Address & Google Scraping** | Apify search integration & `Prospector` domain | GBP Optimisation & Review Gen | Enrich local lead records with exact location details, GBP status, and reviews count to formulate targeted audit pitches. |
| **Competitor / Site Ingestion** | `ingest_knowledge` & `Business Intelligence` domain | Competitor Monitoring | Extract service gaps and value propositions from local UK competitor websites to find angles for cold outreach. |
| **ClickUp Task Dispatching** | `clickup_create_task` & `Operations` domain | CRM & AI Automation | Automatically coordinate client onboarding steps, site builds, and automated SMS/email follow-up setup. |
| **HTML Invoice Builder** | `generate_invoice` & `Operations` domain | Revenue Tracking | Automate professional UK billing (in GBP £) with direct bank transfer instructions, accelerating accounts receivable. |
| **System Command Poller** | `system_commands` execution loop | Dashboard Operations | Execute lead scoring, website generation, or email campaigns directly from the Next.js control panel. |
| **Daily Operations Briefing** | Evolved `daily_briefing` tool | Strategic Focus | Pushes a high-value summary of pipeline health, new leads scraped, and client project status directly to Telegram every morning. |
| **Context Synchronization** | `Hermes` sync interface | Strategic Alignment | Sync goals, priorities, and shared contacts across repositories without replicating large, stale memory indexes. |

---

## Strategic Review of Peripheral Capabilities

Following our B2B commercial focus, any capability that does not directly drive lead generation, CRM automation, client delivery, or financial tracking has been reassessed:

1. **YouTube Strategist (`youtube_strategist`)**:
   * *Status*: **Deprecated**
   * *Outcome*: Non-core. Suggesting video titles does not acquire local service business clients (e.g. roofers, removals, restaurants).
   * *Replacement*: Merged into the **Business Intelligence** research module to track general local market trends and competitor website strategies.

2. **Personal Fitness Logging (`log_weight`)**:
   * *Status*: **Removed**
   * *Outcome*: Zero business outcome. Personal weight tracking creates conversational noise and dilutes the professional purpose of the Business Operator.
   * *Replacement*: Replaced by automated API Cost Tracking and Railway/Supabase System Health checks in the daily Operations brief.
