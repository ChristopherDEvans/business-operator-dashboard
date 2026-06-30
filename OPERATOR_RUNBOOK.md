# EvansAISolutions Business Operator Runbook

This document details the standard operating procedures, maintenance guides, and testing parameters for the EvansAISolutions Business Operator daemon and Mission Control dashboard.

---

## 1. Running Locally

### Prerequisites
* Node.js v20+
* NPM v10+

### Step-by-Step
1. Make sure you have a valid `.env` file matching the template in [ENVIRONMENT_AUDIT.md](file:///c:/Users/CEvns/Desktop/Antigravity/Gravity%20Claw/ENVIRONMENT_AUDIT.md).
2. Install all dependencies:
   ```bash
   npm install
   ```
3. Run the TypeScript bot in development mode:
   ```bash
   npm run dev
   ```
4. Run the Next.js dashboard locally:
   ```bash
   cd mission-control
   npm install
   npm run dev
   ```
   *Dashboard will be available at: http://localhost:3000.*

---

## 2. Deploying to Railway

The bot runs as a background service on Railway.
1. Commit all your changes to GitHub.
2. Push to the main repository. Railway is configured to trigger automated deployments on pushes to `main`.
3. Check deployment progress and container status directly in the Railway console.

---

## 3. Local Testing Coordination (Pausing Production)

> [!CAUTION]
> To prevent race conditions, duplicate Telegram replies, and database lock conflicts, never run the local bot daemon while the production Railway bot is active.

### Pausing Railway before Local testing:
1. Open the Railway Console dashboard.
2. Click on the `gravity-claw` service node.
3. Select **Settings** ➔ **Service Settings** ➔ Click **Pause**.
4. Run your local bot daemon using `npm run dev`.
5. Once local testing is completed, stop your local daemon (`Ctrl + C`) and click **Resume** on Railway.

---

## 4. Maintenance & Backups

### Automated DB & Supabase Export
To backup all SQLite files (`gravity-claw.db`, `usage.db`) and export critical Supabase tables (`system_commands`, `activity_log`, `leads`, `campaigns`, `projects`) to JSON, run:
```bash
npx tsx scripts/backup.ts
```
*Files are saved under `backups/backup-<timestamp>/` directory.*

---

## 5. Command Troubleshooting & Rollback

### Recovering from Failed Commands
1. Open the **Command Audit Trail** history panel on the Mission Control dashboard.
2. Examine the error details printed inside the failed card.
3. Address the underlying error (e.g. missing API keys, directory path mismatches).
4. Select a target lead, input the template ID, and trigger the action button again to insert a fresh command.

### Code Rollback
If a deployment introduces issues:
1. Open the Railway console.
2. Click on `gravity-claw` service ➔ **Deployments**.
3. Locate the previous successful commit ID ➔ Click **Rollback** to instantly restore service.
