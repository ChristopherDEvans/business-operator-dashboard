---
name: design-template-stamper
description: Automates the creation of a new client website by cloning a master template from your Template Vault, configuring the initial metadata for the client, and updating the database to reflect the new project.
---

# Design Template Stamper

## When to use this skill
- You have analyzed a competitor website and the user says "Go ahead and stamp out a site for them."
- The user uses the `/generate-site` quick action on Gravity Claw.
- You need to quickly scaffold a premium Vite/React setup injected with CodeGrid-style formatting.

## Workflow

### 1. Template Resolution
Check the specified niche. If it's a roofer, we use the `roofer-site-template`. If it's a restaurant, we use the `restaurant-template` or default base template.

### 2. Scaffold the Clone
Execute the cloning script under `scripts/stamp_site.js` which handles:
- Duplicating the master template directory into a new `[Client Name] Website` folder on the Desktop or Projects folder.
- Deleting old `.git` histories.
- Performing `npm install` gracefully so it's ready to boot.

### 3. Personalization Injection
The script automatically finds and replaces generic placeholders in the code:
- Updates `<title>` in `index.html` to the Client's Name.
- Updates the `<meta description>`.
- Replaces branding text in `src/App.tsx` or `src/globals.css`.

### 4. CodeGrid Asset Integration
If the requested style includes specific CodeGrid animations (e.g., cinematic hero reveal), invoke the integration protocol to copy those specific `CodeGrid Files` over into the new `src/components` folder.

### 5. Database Sync
Insert a new row into the Gravity Claw `projects` table:
- `name`: "[Client Name]"
- `type`: "client"
- `status`: "active"
- `health`: "good"
- `last_update`: "Website template scaffolded."

## Execution
Run the node script with:
```bash
node scripts/stamp_site.js --niche "roofer" --name "Client Name"
```
