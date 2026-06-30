# Railway Deployment Skill

Tools and knowledge for deploying and managing Gravity Claw on Railway using the standardized "Pause-Test-Deploy-Verify" cycle.

## Core Commands
- **Pause Service**: `railway down` (Prevents Telegram polling conflicts)
- **Local Dev**: `npm run dev` (Runs `tsx watch src/index.ts`)
- **Type-Check**: `npx tsc --noEmit`
- **Deploy**: `railway up --detach`
- **Monitor**: `railway logs --lines 100`

## SOP: The Dev Cycle
1. **Pause Railway**: `railway down`
2. **Local Test**: Run `npm run dev` and interact with the bot.
3. **Type-Check**: Ensure no breaking changes.
4. **Deploy**: `railway up --detach`
5. **Verify**: Check logs for successful connection.

## Environment Management
- List variables: `railway variables`
- Set variable: `railway variables set KEY="VALUE"`

## Memory Considerations
- **SQLite**: Local `gravity-claw.db` is EPHEMERAL and resets on every deploy.
- **Pinecone**: Cloud-hosted and PERMANENT across deploys.
