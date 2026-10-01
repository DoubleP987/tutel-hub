# Vercel public calendar

The latest deployment uses the `vercel-public` directory and the calendar data API. Follow [CALENDAR-API.md](CALENDAR-API.md) for current setup instructions in English and Thai.

- Framework: Other
- Root Directory: `vercel-public`
- Install Command: `npm ci --omit=dev`
- Build Command: empty
- Output Directory: `.`
- Runtime: Node.js 24
- Private Blob store connected to the project
- Server environment: `BLOB_STORE_ID` (OIDC) or legacy `BLOB_READ_WRITE_TOKEN`, plus `CALENDAR_SYNC_SECRET`

GitHub updates deploy source changes. Event updates only write a public snapshot through the authenticated API, without deploying source.

## Push without deploying

A commit message containing `[skip vercel]` makes the configured Ignored Build Step skip that Git deployment. Other commits keep automatic deployment. The currently published website is unchanged when a deployment is skipped.
