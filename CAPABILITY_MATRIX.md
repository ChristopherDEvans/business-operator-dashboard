# Gravity Claw Capability Matrix

This matrix evaluates all existing capabilities of Gravity Claw and determines their role in the evolved **EvansAISolutions Business Operator**.

---

## Capability Evaluation Table

| Capability | Current Function | Status | Action | Business Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Telegram Grammy Bot Interface** | Primary chat control interface for user commands. | Core | **KEEP** | Essential for hands-free and mobile operator commands, alerts, and quick status reports. |
| **Complexity-Aware Model Selector** | Routes complex prompts to Claude and simple prompts to Gemini. | Helper | **IMPROVE** | Keep the cost efficiency, but update the routing keywords to match business domains (e.g. LinkedIn, Prospector, Upwork, and Website Factory). |
| **ElevenLabs TTS (`speak`)** | Synthesizes response messages into voice notes. | Secondary | **KEEP** | Valuable for audial status reports or hands-free briefings when the operator is driving or away from the dashboard. |
| **Groq Whisper Voice Transcriber** | Transcribes inbound user voice messages into text. | Core | **KEEP** | Critical for dictation, mobile lead capture, and voice-driven command inputs. |
| **Three-Tier Memory Orchestration** | Syncs memory facts and conversations across SQLite, Pinecone, and Supabase. | Core | **KEEP** | Maintains a rich context of client interactions. Will eventually consume sync payloads from the Hermes communication sync layer. |
| **Daily Accountability Briefing** | Generates a daily brief covering weather, news, ClickUp tasks, memory, and weight. | Core | **IMPROVE** | Retain morning trigger, but pivot content. Replace weather/general tech news/weight with British commercial sales metrics, campaign conversion rates, active website project health, and Upwork lead counts. |
| **ClickUp Task Creation** | Creates tasks in ClickUp under specific list IDs. | Core | **KEEP** | Directly handles operational execution, project tracking, and task delegation. |
| **HTML Invoice Generator** | Generates Nebula Dark style billing invoices and researches address via Apify. | Core | **IMPROVE** | Align strictly with UK local business context (convert default currency to GBP £, update payment instructions for UK bank transfers, and integrate with CRM updates). |
| **Site Template Stamper (`stamp_site.js`)** | Scaffolds Vite/React client template sites to Desktop. | Core | **IMPROVE** | Central to the **Website Factory**. We must eliminate hardcoded machine path dependencies (e.g. `Desktop/Antigravity`) and allow customizable workspaces. |
| **System Command Poller** | Polls Supabase command queue to run bot tasks from dashboard. | Core | **KEEP** | Crucial interface bridge that links Next.js user-interface clicks to agent actions. |
| **Knowledge Ingestion (`ingest_knowledge`)** | Scrapes websites and YouTube transcripts via Apify, saving insights to vector database. | Core | **IMPROVE** | Improve scraping reliability, clean up fallback prompts, and prioritize commercial data extraction (competitor sites, service lists). |
| **YouTube Strategist** | Suggests video titles, fetches thumbnails, and trends. | Peripheral | **DEPRECATE** | EvansAISolutions focuses on B2B local business websites, lead capture, and CRM automation. YouTube optimization is non-core. We will deprecate this and merge trend/topic search into the Business Intelligence domain. |
| **Weight Tracking (`log_weight`)** | Tracks user body weight and body fat logs. | Personal | **REMOVE** | Personal fitness metrics do not align with a B2B business operator. The database tables will remain intact, but the tool will be removed from the agent namespace. |

---

## Detailed Action Definitions

- **KEEP**: The feature is functional, robust, and directly supports the operation of the agency.
- **IMPROVE**: Refactor path dependencies, update styling/formatting (such as switching default currencies to GBP), or adjust routing lists to focus on B2B agency operations.
- **MERGE**: Consolidate tool rules under unified domains (such as moving YouTube trend scraping into Business Intelligence research tools).
- **DEPRECATE**: Phase out support. The tool remains in the registry but is excluded from system-prompts and defaults.
- **REMOVE**: Completely remove the tool from the registry to prevent the LLM from executing it, cleaning the namespace.
