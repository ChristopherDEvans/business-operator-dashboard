# Gravity Claw Current State Audit

This document provides a comprehensive architectural review of the existing **Gravity Claw** codebase as of 30th June 2026. This audit was completed prior to initiating any refactoring.

---

## 1. System Architecture Overview

Gravity Claw is currently structured as a hybrid, multi-process AI agent system and control dashboard designed to operate 24/7. It consists of two main applications running side-by-side:

1. **Telegram Bot (Backend CLI & Agent Loop)**:
   - Built on TypeScript (using `npx tsx` for development execution).
   - Utilizes the `grammy` library for a long-polling Telegram bot interface.
   - Executes an iterative agent loop (`src/agent.ts`) that manages prompts, invokes local tools, calls external Model Context Protocol (MCP) servers, tracks API token costs, and logs execution.
   - Dynamic model routing: Automatically routes complex requests (code, refactoring, dashboard overrides) to `anthropic/claude-3.5-sonnet` and cost-effective requests to `google/gemini-2.0-flash-001`.
   
2. **Mission Control Dashboard (Frontend Web App)**:
   - Built with Next.js (App Router, Version 15.0.1) and React (Version 18.3.1).
   - Serves as the operational control panel for Chris Evans (founder of EvansAiSolutions).
   - Subscribes directly to remote Supabase tables via WebSockets (Supabase Realtime channels) to display live agent activity feeds, campaign success metrics, and active client project status.
   - Integrates a command queue mechanism (`system_commands` table) to let the user dispatch natural language or structured commands directly from the dashboard to the running bot process.

---

## 2. Folder Structure

```
Gravity Claw/
├── .agent/                    # Agent-specific workflows and skill definitions
│   ├── skills/                # Core modular workflows (TDD, lead enrichment, etc.)
│   └── workflows/             # Deployment and operations guides (Railway, etc.)
├── .dockerignore              # Docker build exclusions
├── .gitignore                 # Git exclusions
├── .railwayignore             # Railway deployment build exclusions
├── Chris media assets/        # Media assets and background bio for founder Chris Evans
├── Dockerfile                 # Docker configuration for Railway environment
├── dist/                      # Compiled TypeScript build output (for production)
├── gravity-claw.db            # Local SQLite database (Tier 1 memory buffers & reminders)
├── mcp_config.json            # Central MCP client setup (Supabase, Zapier, Pinecone, etc.)
├── mission-control/           # Next.js web application root
│   ├── src/
│   │   ├── app/               # App Router pages (logs, content, settings, api routes)
│   │   ├── components/        # Shared React dashboard components (clocks, UI widgets)
│   │   └── lib/               # Database client and Supabase bindings
│   └── package.json           # Next.js project package configuration
├── package.json               # Root project dependencies & scripts
├── scripts/                   # Workspace automation scripts
│   └── stamp_site.js          # Clones site templates from Desktop Template Vault
├── src/                       # Main agent source directory
│   ├── lib/                   # Internal core libraries
│   │   ├── llm/               # LLM provider classes (Anthropic, Gemini, OpenRouter)
│   │   ├── db.ts              # Local better-sqlite3 database wrapper
│   │   ├── embeddings.ts      # OpenRouter/OpenAI embedding generator
│   │   ├── mcp.ts             # Multi-server MCP Client orchestrator
│   │   ├── pinecone.ts        # Pinecone vector DB connector
│   │   ├── supabase.ts        # Supabase client wrapper and logging methods
│   │   └── usage.ts           # Cost and token usage tracker
│   ├── tools/                 # Agent tools
│   │   ├── clickup_create_task.ts
│   │   ├── daily_briefing.ts
│   │   ├── generate_invoice.ts
│   │   ├── get-current-time.ts
│   │   ├── ingest_knowledge.ts
│   │   ├── log_weight.ts
│   │   ├── memory_tools.ts
│   │   ├── reminders.ts
│   │   ├── speak.ts
│   │   ├── update_soul.ts
│   │   └── youtube_strategist.ts
│   ├── agent.ts               # Iterative agent loop & model router
│   ├── bot.ts                 # Telegram bot handlers (text, voice, model selector commands)
│   ├── config.ts              # Environment variable parsing and validation
│   ├── heartbeat.ts           # Cron scheduler for morning briefings and command polling
│   ├── index.ts               # Application entry point
│   ├── memory.ts              # 3-tier memory orchestration (SQLite/Pinecone/Supabase)
│   ├── onboarding.ts          # Telegram user onboarding flow
│   ├── soul.md                # Agent personality rules
│   ├── tts.ts                 # ElevenLabs Text-to-Speech API wrapper
│   └── voice.ts               # Groq Whisper Speech-to-Text transcriber
├── stamped-sites/             # Directory containing generated/cloned client sites
├── supabase/                  # Database management migrations
│   └── migrations/            # SQL scripts defining tables, indexes, vector matchers
├── tsconfig.json              # TypeScript compilation options
└── usage.db                   # Local SQLite database tracking LLM costs & latency
```

---

## 3. Database Architecture (3-Tier Storage)

Gravity Claw implements a hybrid local-remote database architecture to optimize for speed, context length, cost, and synchronization:

### Tier 1: Local SQLite (`gravity-claw.db` & `usage.db`)
- **`gravity-claw.db`**:
  - `core_memory`: Stores user profile facts in a JSON array (indexed by Telegram user ID).
  - `messages`: Active buffer of the latest 20–30 conversation exchanges to preserve local context.
  - `summaries`: Stores long-term conversation summaries generated after memory compaction runs.
  - `reminders`: Stores user reminders with a fired status flag.
- **`usage.db`**:
  - `usage`: Tracks model calls, timestamp, tokens (prompt, completion), estimated dollar cost, and response latency. Used for billing reports.

### Tier 2: Vector Memory (Pinecone)
- Namespaces:
  - `conversations`: Houses 1536-dimension embeddings of raw chat logs. Filtered by user ID.
  - `knowledge`: Houses embeddings of extracted facts and documents, enabling semantic retrieval.

### Tier 3: Cloud Database (Supabase PostgreSQL)
- **`messages`**: Remote storage of chat logs with vector support.
- **`memories`**: Mirror of distilled core profile facts.
- **`activity_log`**: Structured execution logs (`message`, `tool`, `error`, `system`, `content`, `task`).
- **`bot_config`**: Configuration settings (e.g., timezone, briefing schedule, templates, and prompts).
- **`leads`**: Leads scraped by cold outreach campaigns.
- **`projects`**: Operational projects (internal templates and paying clients).
- **`campaigns`**: Outreach success statistics (sent, opened, clicks, status).
- **`content_items`**: Live content performance tracking (views, engagement rates, ai recommendations).

---

## 4. Services & Daemon Operations

1. **Telegram Listener (Grammy Long-Polling)**:
   - Listens on Telegram for text and voice messages from whitelisted user IDs.
   - Triggers the main agent loop synchronously for each request, responding with text and voice.

2. **System Command Poller (Supabase to Bot Gateway)**:
   - Runs inside the bot daemon on a `setInterval` loop every 10 seconds.
   - Queries `system_commands` table for records where `executed = false`.
   - Executes commands (`heartbeat`, `brief`, `sync`, or custom text pings) and pings the allowed Telegram users.

3. **Cron Jobs (`node-cron` Scheduler)**:
   - **Morning Briefing Job**: Schedules a daily accountability reach-out using the cron schedule specified in `bot_config` (defaults to `0 8 * * *` Europe/London).
   - **Reminder Poller**: Runs every 60 seconds. Checks local SQLite `reminders` table, pings the Telegram user, and marks the reminder as fired.

---

## 5. Tool Registry & Integration Mapping

The system has a unified Tool Registry (`src/tools/registry.ts`) that manages local TS modules and exposes them alongside dynamically loaded MCP tools.

| Tool Name | Origin | Description / Dependencies |
| :--- | :--- | :--- |
| `get_current_time` | Local | Date/Time fetching using timezone overrides. |
| `speak` | Local | Text-to-Speech via ElevenLabs. |
| `remember_fact` | Local | Inserts facts into Core Memory (SQLite + Supabase + Pinecone). |
| `recall_memory` | Local | Contextual retrieval of past chat messages. |
| `save_data` / `query_data` | Local | Structured generic data caching. |
| `clickup_create_task` | Local | Posts tasks directly to ClickUp using a configured workspace list. |
| `log_weight` | Local | Logs weight metrics to Supabase `weight_logs` table. |
| `ingest_knowledge` | Local | Scrapes a webpage or YouTube video. Youtube uses Apify `youtube-transcript-extractor`. |
| `update_soul` | Local | Modifies `src/soul.md` behavior rules dynamically. |
| `generate_invoice` | Local | Scrapes address via Apify, builds premium styled HTML billing sheet. |
| `daily_briefing` | Local | Fetches weather (wttr.in), ClickUp tasks, news (Apify), and weight statistics. |
| `set_reminder` | Local | Inserts a reminder into the local SQLite table. |
| `youtube_strategist` | Local | Generates video titles, trend reports, and thumbnail grabs. |
| *MCP Tools* | Supabase | Manages branches, edge functions, organization tables, and project runs. |
| *MCP Tools* | Zapier | Integrates with extensive email/calendar automation (currently filtered). |

---

## 6. Railway & Docker Configurations

- **`Dockerfile`**: Builds a thin Node 20 environment (`node:20-slim`). Installs `python3` and `python3-pip` to run a virtual environment containing `youtube-transcript-api` to pull YouTube transcripts locally. Executes the agent with `npx tsx src/index.ts`.
- **Railway Configuration**: Runs the long-polling Telegram daemon 24/7. Reads environment variables from the Railway dashboard (e.g. API keys, database URLs).

---

## 7. Audit Findings: Unfinished, Duplicated, or Unused Assets

During this repository audit, several areas of technical debt and design mismatches were identified:

1. **Duplicated Soul Definitions**:
   - `soul.md` exists in the root workspace folder and in `src/soul.md`.
   - The agent reads from `src/soul.md` (or Supabase `bot_config` overrides), making the root `soul.md` file redundant and outdated.

2. **Hardcoded Machine Paths in Scripts**:
   - `scripts/stamp_site.js` expects templates to be located at `C:\Users\CEvns\Desktop\Antigravity\Template Vault`.
   - Generates sites inside `C:\Users\CEvns\Desktop\Antigravity\Generated Sites`.
   - This prevents execution in other environments or remote containers. These paths must be made configurable via `.env` or relative path settings.

3. **Stentered Background Compaction Placeholder**:
   - The memory compaction and background fact extraction logic in `src/agent.ts` is currently written as a hollow promise:
     ```typescript
     (async () => {
       try {
         // Here we would call an LLM to extract facts from the latest exchange
         // and run compactIfNecessary if Tier 1 grows too large.
       } catch (e) {}
     })();
     ```
   - Compaction is defined in `src/memory.ts` (`compactIfNecessary`) but never actually invoked here.

4. **Redundant Fitness Tracking in Operator Loop**:
   - The `log_weight` tool and weight logs in the morning brief are personal metrics. Since Gravity Claw is evolving into a commercial Business Operator for EvansAiSolutions, this capability should be removed from the core operator flow.
