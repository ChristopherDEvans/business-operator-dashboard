---
description: The full pause-test-deploy-verify cycle for Railway.
---

1. Stop the live bot instance to avoid polling conflicts.
// turbo
2. `railway down`

3. Ensure code is error-free.
// turbo
4. `npx tsc --noEmit`

5. Deploy the new build to Railway.
// turbo
6. `railway up --detach`

7. Wait for initialization then verify logs.
// turbo
8. `railway logs --lines 40`
