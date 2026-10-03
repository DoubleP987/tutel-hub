# Architecture and maintenance

Tutel Hub has two runtimes. The active node owns Discord, audio, calendar scheduling and outbound synchronization. SQLite supports standalone installations; MongoDB Atlas shares persistent data between homeserver and Oracle. A database lease elects one active bot. Authentication and the private panel run locally on each node. `vercel-public/`
owns the public frontend and the authenticated snapshot receiver/read API.

## Source ownership

| Area                  | Responsibility                                            |
| --------------------- | --------------------------------------------------------- |
| `src/index.js`        | Composition and shutdown                                  |
| `src/auth/`           | Passwords, accounts, sessions                             |
| `src/database/`       | Connection, schema, settings                              |
| `src/bot/`            | Discord lifecycle                                         |
| `src/commands/`       | Definitions and separate music/radio/calendar handlers    |
| `src/music/`          | Per-guild state, streaming, station directory             |
| `src/calendar/`       | Events, recurrence, reminders, notifications, publication |
| `src/web/routes/`     | Focused Express route families                            |
| `src/web/middleware/` | Shared authentication/authorization/CSRF                  |
| `src/web/public/`     | Admin frontend and canonical shared browser assets        |
| `vercel-public/`      | Standalone Vercel public frontend/API                     |
| `netlify-public/`     | Legacy static provider frontend                           |

`calendar/db.js`, `calendar/service.js` and `commands/handlers.js` are thin
compatibility facades. Existing imports retain their public interfaces.

## Shared browser assets

Edit `app.css`, `calendar-view.js`, `preferences.js`, icons and the manifest
under `src/web/public/`, then run `npm run assets:sync`. The generated copies
remain committed for independent provider deployment. Provider entry pages,
clients, service workers and API/config files are intentionally separate.

## Formatting

Use `npm run format` to write formatting and `npm run format:check` to report
differences. `.editorconfig`, `.gitattributes` and Prettier use UTF-8, LF and
two-space indentation. Formatting does not prove runtime behavior.

## Public data flow

Admin edits are committed to SQLite, followed by a five-second debounce.
The publisher also checks every minute, projects public fields, skips
unchanged content and sends an authenticated HTTPS snapshot. Vercel checks
schema/revision and writes private Blob conditionally. Visitors read
`GET /api/calendar` with caching. No deployment occurs for an event update.

All exported custom events are public; there is no visibility flag.
Queue/timer state is in memory, reminders use best-effort deduplication,
radio requires an online stream and holiday data requires maintenance.

## Detailed handbooks

- [English source](HANDBOOK.en.md)
- [Thai source](HANDBOOK.th.md)
- [English PDF](manuals/Tutel-Hub-Handbook-EN.pdf)
- [Thai PDF](manuals/Tutel-Hub-Handbook-TH.pdf)

The books explain the implementation, deployment, security boundaries,
database schema, API contracts, commands and troubleshooting. Recommendations
are labeled separately from implemented features.

## Current extensions

- `src/cluster/`: leases, local watchdog and encrypted commands to the active node. See [MongoDB and failover](MONGODB-FAILOVER.md).
- `src/database/store.js`: asynchronous SQLite/MongoDB persistence adapter.
- `src/config/` and `src/i18n/`: configurable bot language, profile description and private `/help`. See [Bot language](BOT-LANGUAGE.md).
- `src/music/panel.js`: persistent latest Discord music controls, including Loop. See [Music panel](MUSIC-PANEL.md).

Public calendar updates use an outbound authenticated API request, rather than rebuilding Vercel for each event. The promo website is a separate static project rooted at `promo-site/`. Calendar Preview builds are disabled because the optional `gh-pages` branch contains only promotional files. Production uses `main`.

## Current operation update / อัปเดตการทำงาน

[Current operation, 4 October 2026 / การทำงานปัจจุบัน](CURRENT-OPERATIONS.md) documents the single random-genre selector, private music/radio replies, per-guild playback status, host cards, sidebar logout and working log route.
