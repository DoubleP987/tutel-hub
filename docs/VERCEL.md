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

## Preview deployments and the promotional site

The calendar project's Preview deployments are disabled. Its production branch remains `main`. The optional `gh-pages` branch only contains the promotional website, so it cannot build the calendar's `vercel-public` root. Old failed Preview records are retained as inactive history.

The promotional Vercel project is separate: root `promo-site`, framework Other, no install/build command, output `.`. Its primary address is https://tutelbot.vercel.app. The site configuration excludes `gh-pages` deployments and permits `main`. A repository homepage link does not deploy anything by itself.
