---
name: github-vercel-deployment
description: Automates the process of creating a new GitHub repository, pushing local code to it, and deploying the repository directly to Vercel for production hosting. Incorporates custom learnings for avoiding Git remote errors and Vercel project name validation errors.
---

# GitHub and Vercel Deployment Skill

## When to use this skill
- The user asks to "publish the website", "upload to GitHub and Vercel", or make a local project "live".
- The user has a local project directory that needs to be hosted online.

## Prerequisites
- The user must be authenticated with the GitHub CLI (`gh auth status`).
- A valid `VERCEL_TOKEN` must be available, either in the MCP configuration or provided by the user/environment.
- The project must be a Git repository (`git init` if not already).

## Workflow

Copy the following checklist into a scratchpad before starting to track your state. Follow these steps precisely:

1. [ ] **Verify Git Status & Remotes:** Check `git status` and `git remote -v`. If the project was cloned from another template (e.g., `origin https://github.com/.../template.git`), remove the old remote using `git remote remove origin` so it doesn't conflict with the new repository creation.
2. [ ] **Create GitHub Repository:** Use the GitHub CLI to create the repository. 
   - Command: `gh repo create <project-name> --public --source=.`
   - *Learning:* Do not rely entirely on the `--push` flag if there are remote conflicts. If it fails to add the origin, manually add it: `git remote add origin https://github.com/<username>/<project-name>.git` (or `git remote set-url origin ...`).
3. [ ] **Commit and Push Code:** Add all files, commit, and push. 
   - *Learning:* In Windows PowerShell, do not use `&&` to chain commands. Use `;` instead.
   - Command: `git add . ; git commit -m "Initial deployment commit" ; git push -u origin main`
4. [ ] **Link Vercel Project:** Link the project to Vercel *before* deploying to catch any naming directory errors.
   - Command: `npx vercel link --token <VERCEL_TOKEN>`
   - *Learning:* Vercel project names cannot contain spaces (e.g., "roofer website 2" will fail). They must be lowercase and only contain letters, digits, '.', '_', and '-'. Use the interactive `link` command via `send_command_input` to set a valid project name if the folder name is invalid.
5. [ ] **Deploy to Vercel Production:** Run the Vercel deployment command to publish the site.
   - Command: `npx vercel --token <VERCEL_TOKEN> --yes --prod`
6. [ ] **Provide Live URLs:** Extract the production URL from the deployment output (e.g., `https://project-name.vercel.app`) and provide it to the user.
7. [ ] **Update Leads Data:** If this deployment is for a client from the enriched leads list, locate the `Roofers in Staffs - Enriched - Cleaned.csv` file (or the active leads list) and update the `New Website` column for that particular business with the new Vercel production URL.

## Instructions

- Always execute terminal commands asynchronously if they involve network requests or interactive prompts. Wait and use `send_command_input` to respond to Vercel or Git prompts.
- If `gh auth status` shows the user is not logged in, prompt them to run `gh auth login --hostname github.com -p https -w` and provide them with the one-time device code.
- Always be mindful of the VERCEL_TOKEN. If using raw commands, ensure the token is passed via `--token` flag.

## Error Handling

- **PowerShell `&&` Error:** If you get `The token '&&' is not a valid statement separator in this version.`, remember to use `;` to chain commands in PowerShell.
- **Git Push Error (No Upstream):** If `git push` fails because there's no upstream branch, ensure you use `git push -u origin main` or `git push -u origin master`.
- **Vercel Project Name Error:** If Vercel fails with `Error: Project names can be up to 100 characters long...`, it means the directory name has spaces or capital letters. Run `npx vercel link` interactively to assign a valid, hyphenated name (e.g., `my-project-name`) before deploying.
- **MCP Tool Limit Exceeded:** If the Vercel MCP server is used and throws a 100-tool limit error, ensure you have updated the `disabledTools` array in `mcp_config.json` to keep only a small number of core necessary tools enabled (like restricting it to exactly 10).
