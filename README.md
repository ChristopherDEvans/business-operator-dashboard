# EvansAISolutions Business Operator (Gravity Claw)

The **Business Operator** is an internal EvansAI control/orchestration project: a Telegram-driven daemon plus a Next.js Mission Control dashboard that can coordinate business workflows across multiple EvansAI systems.

It is best understood as an **operator layer**, not as the source of truth for every domain it touches.

## What it does

At a high level:

```
Mission Control / Telegram
          ↓
    Business Operator
          ↓
  command + approval logic
          ↓
 domain adapters / tools
          ↓
Prospector · LinkedIn · Website Factory · Operations · Hermes context
          ↓
 Supabase audit/status + local usage data
```

The code currently contains:

- Telegram bot orchestration via Grammy;
- startup safety checks;
- Supabase-backed command/status handling;
- a scheduled morning heartbeat;
- local reminders;
- a `system_commands` poller;
- domain adapters for Operations, Prospector, Upwork Radar, LinkedIn OS, Website Factory and Hermes-related context;
- local SQLite usage/state tracking;
- a separate Next.js Mission Control application.

## Current status

**Status: functional internal orchestration project, with several domain actions still dependent on configuration, local paths, external services or manual review.**

Do not interpret the existence of an adapter as proof that the full downstream workflow is production-ready.

The code explicitly supports fallback/manual modes. Examples include:

- running without Supabase in a reduced local/manual mode;
- Website Factory falling back when local template paths are not configured;
- commands returning `manual_mode`;
- Upwork proposal generation requiring human approval rather than auto-applying.

Railway deployment is documented in the operator runbook, but the repository itself does not prove that a particular Railway deployment is currently healthy or running.

## Architecture

### 1. Telegram daemon

Entry point:

- `src/index.ts`

Responsibilities include:

- checking authorized Telegram user IDs;
- checking required configuration;
- detecting Railway;
- warning about local/cloud concurrency;
- initializing tools;
- starting scheduled/command heartbeat services;
- starting Telegram long polling;
- handling graceful shutdown.

### 2. Heartbeat and command processor

- `src/heartbeat.ts`

This contains:

- configurable morning briefing schedule;
- Supabase config change listener;
- local reminder poller;
- `system_commands` polling;
- routing to domain adapters;
- command status / audit updates.

The current default morning schedule is read from Supabase with a fallback of `0 8 * * *`, using `Europe/London` as the fallback timezone.

### 3. Domain adapters

Under `src/domains/`, the project provides integration points for:

- Operations
- Prospector
- Upwork Radar
- LinkedIn OS
- Website Factory
- Hermes-related priorities/context

These adapters should be treated as **integration boundaries**, not necessarily as authoritative implementations of those products.

### 4. Mission Control

The `mission-control/` directory is a separate Next.js application used as the visual command centre.

Current stack includes:

- Next.js 15
- React 18
- Supabase
- Pinecone
- Apify
- OpenAI SDK
- PDF parsing utilities

### 5. Data / state

The project uses two types of state:

- **Supabase** — shared command, configuration and business data where configured;
- **SQLite** — local agent/usage state.

## Safety model

Important existing safeguards include:

- explicit Telegram allow-list;
- required production environment checks on Railway;
- warning when local execution may conflict with a cloud instance;
- human approval requirement for sensitive workflow classes such as Upwork applications;
- status/audit logging for command execution;
- manual-mode fallbacks instead of pretending unavailable integrations are active.

### Important operational warning

Do **not** run a local Telegram bot instance at the same time as the Railway instance unless you explicitly intend to test concurrency behaviour. The runbook warns this can cause duplicate replies and command-polling races.

## Local development

### Requirements

- Node.js 20+
- npm
- SQLite

Install and run the daemon:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm start
```

Mission Control:

```bash
cd mission-control
npm install
npm run dev
```

## Configuration

See:

- [ENVIRONMENT_AUDIT.md](ENVIRONMENT_AUDIT.md)
- [OPERATOR_RUNBOOK.md](OPERATOR_RUNBOOK.md)

Core environment variables documented by the project include:

- `TELEGRAM_BOT_TOKEN`
- `OPENROUTER_API_KEY`
- `ALLOWED_USER_IDS`
- `SUPABASE_URL`
- `SUPABASE_KEY` / compatible Supabase key
- optional local paths for LinkedIn OS, Prospector, Hermes sync, template vault and generated sites;
- optional third-party integration keys such as Apify / Google / ClickUp.

Never commit real credentials.

## Deployment

The runbook documents Railway deployment for the daemon and explains how to pause the cloud service before local testing.

Treat deployment state as something to verify externally; repository documentation is not a live health check.

## Relationship to other EvansAI repositories

This repo coordinates other systems but should not replace their own source-of-truth documentation.

Examples:

- **Prospector / Local Growth Engine** — acquisition pipeline and lead system.
- **LinkedIn OS / LinkedIn Growth OS** — LinkedIn workflows and drafting.
- **Safebox** — agent security / controlled capability.
- **Hermes** — agent runtime/memory layer.
- **evans-os** — formal EvansAI governance and decisions.

If this README conflicts with a domain repository or `evans-os`, verify the newer authoritative source before changing behaviour.

## Known limitations / verification points

Before describing this as fully production-ready, verify:

- current Railway deployment state;
- Mission Control data is live rather than placeholder/stale;
- each domain adapter against the current version of its downstream repo;
- current Supabase schema compatibility;
- current local path assumptions;
- scheduled jobs and Telegram delivery;
- approval boundaries for actions that can publish, contact, spend or mutate client/business systems.

## Documentation rule

When adding a new operator command, document:

1. command name;
2. owning domain;
3. required inputs;
4. external dependencies;
5. whether it mutates state;
6. whether human approval is required;
7. fallback behaviour;
8. audit/status output.

That keeps the Business Operator understandable as the EvansAI estate grows.
