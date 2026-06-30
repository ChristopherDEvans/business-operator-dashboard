# EvansAISolutions Business Operator Environment Audit

This document defines all environment variables required or consumed by the bot daemon and Mission Control dashboard.

---

## 1. Core Config (Required)

| Env Variable | Required / Optional | Purpose | Usage Location | Safe Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `TELEGRAM_BOT_TOKEN` | **Required** | Access token for the Grammy Telegram bot daemon. | `src/bot.ts` | `123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ` |
| `OPENROUTER_API_KEY` | **Required** | LLM orchestrator token for routing extraction and scoring. | `src/agent.ts` | `sk-or-v1-abcdef123...` |
| `ALLOWED_USER_IDS` | **Required** | Comma-separated list of Telegram user IDs allowed to run instructions. | `src/config.ts` | `5816642744` |

---

## 2. Shared Cloud Storage (Highly Recommended)

| Env Variable | Required / Optional | Purpose | Usage Location | Safe Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `SUPABASE_URL` | Optional | Connection URL to the cloud PostgreSQL database and real-time subscription. | `src/lib/supabase.ts` | `https://xyiatnquuaoruajlwtdw.supabase.co` |
| `SUPABASE_KEY` | Optional | Service / Anon client key for writing logs, commands, and lead pipelines. | `src/lib/supabase.ts` | `eyJhbGciOiJIUzI1NiIsInR5cCI...` |

---

## 3. EvansAISolutions Domain Paths

| Env Variable | Required / Optional | Purpose | Usage Location | Safe Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `LINKEDIN_OS_PATH` | Optional | Local checkout directory of LinkedIn growth OS (manual mode fallback if empty). | `src/domains/linkedin-os` | `C:/Users/CEvns/Desktop/Antigravity/linkedin-growth-os` |
| `PROSPECTOR_PATH` | Optional | Local folder path to Lovable prospector tools (local fallback if empty). | `src/domains/prospector` | `C:/Users/CEvns/Desktop/Antigravity/prospector-engine` |
| `HERMES_SYNC_PATH` | Optional | Memory synchronization context path for shared prioritizing (fallback if empty). | `src/domains/hermes` | `C:/Users/CEvns/Desktop/Antigravity/hermes-sync` |
| `TEMPLATE_VAULT_PATH` | Optional | Vault location of layouts (roofing, removals, restaurants) used in preview stamping. | `src/domains/website-factory` | `C:/Users/CEvns/Desktop/Antigravity/template-vault` |
| `GENERATED_SITES_PATH` | Optional | Target output folder path where website previews are built by cloning templates. | `src/domains/website-factory` | `C:/Users/CEvns/Desktop/Antigravity/generated-previews` |

---

## 4. Third-Party API Integrations (Optional)

| Env Variable | Required / Optional | Purpose | Usage Location | Safe Example Value |
| :--- | :--- | :--- | :--- | :--- |
| `CLICKUP_API_KEY` | Optional | API token for syncing tasks from EvansAiSolutions boards. | `/api/clickup/tasks` | `pk_12345_abcde...` |
| `CLICKUP_LIST_ID` | Optional | List reference number for ClickUp tasks synchronizer. | `/api/clickup/tasks` | `90180234` |
| `APIFY_API_TOKEN` | Optional | Scraping pipeline token for lead extraction. | `src/config.ts` | `apify_api_xyz...` |
| `GOOGLE_API_KEY` | Optional | Native Gemini model extraction pass-through key. | `src/agent.ts` | `AIzaSy...` |
