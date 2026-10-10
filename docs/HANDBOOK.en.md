> **Current edition, 10 October 2026:** Read [current operation](CURRENT-OPERATIONS.md) first. The matching PDF includes the current-operation guide and Feedback/readability chapters; it supersedes older single-host, reminder, Loop and command descriptions in the baseline chapters.

## Current Calendar boundary - 10 October 2026

Calendar has its own repository: https://github.com/DoubleP987/tutel-calendar. Its web/groups/invitations/mobile drawer/shared dates are deployed on homeserver. Original Discord reminders still run through the legacy integration; new grouped Discord worker cutover remains pending; the privileged panel bridge is implemented. OAuth is web authentication, not a second running bot. Calendar CURRENT-STATUS.md and USER-GUIDE explain the latest behavior. Historical learning examples below retain their original context.

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

**Current behavior / การทำงานล่าสุด:** [Music controls, metadata, Loop and menu expiration](MUSIC-CONTROLS.md). This guide takes precedence over older behavior examples below. / ใช้คู่มือนี้แทนตัวอย่างพฤติกรรมรุ่นเก่าด้านล่าง

# TUTEL HUB

# Complete System Handbook

## Architecture • Code • Calendar • Bot • API • Operations

English edition

by Double_P | 2 October 2026 | Refactored source edition

[Technical diagram included in the PDF edition]

# Contents

Select a chapter or page number to navigate. PDF outline bookmarks are included.

# 01 How to use this handbook

## Scope and reading route

Tutel Hub combines a Discord music/radio bot, a private administration panel, a Thai calendar and a public read-only calendar. This handbook describes the code after the structural refactor dated 2 October 2026. It distinguishes implemented behavior from recommendations. Example events and credentials are fictional; no real secret or database content is reproduced.

Start with the architecture and startup chapters. Then follow an event through the calendar model, SQLite, snapshot generator and API. Study audio separately: its processes and failure modes are different from HTTP and calendar persistence. The appendices map every maintained code file, route and environment setting to its responsibility.

## What the guide does not assume

You do not need prior MySQL experience. A database is explained as tables and persistent records; an API as a contract between programs; a session as a temporary authenticated identity. Commands are accompanied by their purpose, so they are not merely copy-and-paste recipes.

External platforms can change. The lockfiles record the intended dependency versions, while official references at the end provide a route to current platform rules. Radio availability, upstream music access and government holiday declarations are not guaranteed by this repository. Deployment success and actual audible playback are different evidence.

## Learning safely

Experiment with a separate local database and no production Discord token or public-write secret. Follow one harmless event first. This lets you observe data flow without competing with the homeserver bot or publishing private experiments.

# 02 Architecture and data ownership

## Two runtimes

The homeserver runs a long-lived Node process. It owns SQLite, admin authentication, event editing, Discord connection, per-guild audio players, reminder scheduling and outbound publication. Vercel runs a separate public frontend and serverless API. Its private Blob stores a sanitized calendar snapshot. The homeserver database is authoritative; Blob is a public projection, not the master database.

## Direction of communication

An admin browser sends authenticated requests to homeserver. The server writes SQLite and initiates HTTPS requests to Vercel. Public browsers read Vercel's API. Discord interactions arrive through the bot Gateway connection, while replies and messages use Discord APIs. These channels have separate identities and access rules.

A changing residential IP does not break the sender because it connects outward to a stable hostname. Private admin access still requires a reachable LAN address or Tailscale. Outbound data synchronization does not open the home web server to the public internet.

## Read-only is not confidential

Public visitors cannot edit through the public app. However, every exported event title and description is visible. There is currently no per-event visibility field. Even a guild-scoped custom event can appear in the public snapshot: guild scope controls Discord delivery, not public confidentiality. Never enter private details assuming that login on the admin side makes exported data private.

The architecture illustration shows boundaries rather than merely folder names: the important separation is between authoritative data, public projection, private administration and external media/Discord services.

[Technical diagram included in the PDF edition]

Technical diagram drawn from project behavior; chapter text explains limitations.

# 03 Technology choices and resource costs

## Runtime and packages

JavaScript ES modules are enabled by type: module. Node 24 or newer is required by this repository; built-in node:sqlite provides persistent storage without a separate database daemon. Server JavaScript can use filesystem/process APIs. Browser JavaScript runs separately and cannot directly open the server database.

Discord.js models clients, interactions, channels and command definitions. @discordjs/voice owns voice connections and audio players; opusscript provides an Opus encoder. yt-dlp is an external executable for metadata and audio transport. FFmpeg decodes sources into PCM; ffmpeg-static supplies a binary unless FFMPEG_PATH overrides it. Express handles HTTP routes, Helmet supplies security headers, dotenv loads server configuration and date-holidays contributes holiday definitions. The public Vercel package installs @vercel/blob independently of bot dependencies.

## Why this is lightweight

SQLite removes a MySQL service and its configuration overhead. Streaming avoids a persistent library of downloaded songs. Nevertheless, audio bytes still enter the machine and occupy pipes/buffers. FFmpeg decoding and Opus encoding consume CPU. Each simultaneously active guild can add audio subprocesses.

A Node heap limit does not cap total RAM: native buffers, yt-dlp and FFmpeg are outside that budget. A one-gigabyte server may suit modest use but has no unlimited capacity guarantee. Measure actual memory/CPU before promising concurrency. Professional structure makes these trade-offs explicit; it does not require introducing a framework or database server merely for appearance.

# 04 Repository structure and module boundaries

## Responsibility-based layout

src/index.js composes the runtime and owns shutdown. bot manages Discord lifecycle; commands separates definitions, music, radio and calendar handlers; music separates state, media streams and radio discovery. auth holds password/account/session logic, while database owns connection, schema and persisted settings.

calendar separates recurrence mathematics, event storage/query expansion, reminders, message construction, options, holiday sources, snapshots and publication. web/server.js assembles Express and registers focused route modules. web/middleware holds shared access checks. web/public is the authoritative location for shared browser assets.

vercel-public is an independently deployable public app. netlify-public retains the legacy provider frontend. scripts contains maintenance tools; deploy contains a service template; docs contains guides. private, data and backups remain outside version control.

## Stable facades

The original calendar service entry point is now src/integrations/calendar/legacy/service.js. The calendar database facade was removed; imports now use database/ and auth/ directly. commands/handlers.js combines handler groups. A facade reduces interface churn and makes a refactor less disruptive. Keep it thin: it should not become a new monolith.

A module is defined by a coherent job, not an arbitrary line limit. The browser still uses classic scripts; converting everything to browser modules would alter loading and deployment and belongs in a separate change. The appended CSS override order is preserved rather than reordered blindly. Shared copies are generated deliberately, not independently edited. The file appendix explains where to make each kind of future change.

# 05 Startup, concurrency and shutdown

## Startup sequence

index.js loads dotenv/config. Importing the database connection creates its directory, opens DatabaseSync and initializes schema. initializeAccounts creates only missing accounts. The reminder scheduler and publisher start, HTTP begins listening, then bot login is attempted unless bot_enabled is zero. Missing Discord credentials are caught and logged, allowing the panel to remain usable. A database-opening error happens earlier and can stop startup.

Importing the database facade is therefore not side-effect-free. A maintenance script that imports it can create/open a database even if it only intended to inspect a helper. Read the import graph before adding such scripts.

## Async versus synchronous work

Network requests and child-process pipes can progress while JavaScript waits. DatabaseSync and scrypt calls are synchronous and briefly occupy the Node thread. Reminder and publisher busy flags prevent overlapping intervals within one process. They do not coordinate multiple production replicas.

## Graceful shutdown

SIGINT/SIGTERM trigger one guarded shutdown: stop scheduler/publisher work, stop players and Discord, wait for HTTP closure and exit. This avoids leaving audio subprocesses active. SQLite is not explicitly closed in this shutdown; process exit releases it. An explicit close could be a later lifecycle improvement rather than an unannounced behavior change.

Keep one production bot process. Starting the Windows clone with the same live token can create competing interaction handlers and reminder schedulers. A running control panel without a token is a valid development mode, not proof of a broken bot installation.

# 06 Discord identity, installation and registration

## Three separate actions

CLIENT_ID identifies the application; DISCORD_TOKEN authenticates the bot; GUILD_ID optionally identifies a test server. Inviting installs the application in a guild. Logging in connects the bot. Registration publishes command definitions. None of these actions replaces the other two.

The invite uses bot and applications.commands scopes. Permissions include View Channels/Send Messages for text and Connect/Speak for voice. runtime uses Guilds and GuildVoiceStates intents, not message-content parsing for commands.

## Registration scopes

npm run register publishes globally. npm run register:guild targets the configured test guild. Both read commands/definitions.js and use REST. Guild/global definitions can coexist and look duplicated. Inspect scope before deleting; duplicate-looking entries do not automatically mean two bot processes. Registration does not fix media failures or slow interaction acknowledgment.

## Dispatch and acknowledgment

InteractionCreate routes buttons to handleCalendarButton and slash commands to commandHandlers[commandName]. Unknown commands are ignored. Errors are logged and the runtime attempts a private reply/follow-up. Slow work should use deferReply first, then editReply. Discord requires the initial response within three seconds; delay can invalidate an interaction.

Current families are music controls plus randommusic; radio list/play; calendar setup/add/list/delete/config/test. The implemented channel-setting subcommand is setup, not set. Definitions describe inputs and bounds, while handlers implement behavior. Changing only a handler cannot publish a new slash-command option.

# 07 From a music request to audio

## Metadata phase

/play validates guild and caller voice membership, defers the response and calls resolveTrack. URLs pass directly; names become search queries. With scsearch1 configured, search actually asks for ten SoundCloud results and selects an unknown-duration or longer-than-30-second track. This avoids some previews but cannot guarantee a full song.

resolveQuery spawns yt-dlp for JSON. stdout collects metadata; stderr collects diagnostics. Nonzero exit rejects. Output exceeding two million characters triggers termination. The track object contains title, webpage URL and duration, not an audio file. Installing npm dependencies does not install yt-dlp.

## Streaming phase

yt-dlp writes media to stdout with -o -. Its pipe feeds FFmpeg stdin. FFmpeg emits signed 16-bit PCM at 48 kHz stereo. createAudioResource declares Raw input and the voice library encodes it to Opus for Discord. One second of this PCM is 48,000 x 2 x 2 = 192,000 bytes before compression.

No persistent song archive is created. Network data still reaches the machine and occupies memory/pipes: no saved file is more accurate than no download. Stop callbacks kill both subprocesses. FFmpeg ignores expected EPIPE input errors after closure and logs other diagnostics.

The PCM counter estimates seconds produced; it does not prove the listener heard sound. A voice connection can exist while the source is silent, the transcoder fails or permissions prevent output. Diagnose each stage rather than reinstalling everything at once.

[Technical diagram included in the PDF edition]

Technical diagram drawn from project behavior; chapter text explains limitations.

# 08 Player state, queue progression and random mode

## State ownership

player.js keeps a Map keyed by guild ID. Each state owns queue, current track, audio player, connection, stream, randomMode, radio, randomHistory, loadingNext and generation. Music queues live in RAM and disappear on restart; the SQLite calendar does not persist them.

ensureConnection joins and subscribes the player. An existing connection in another channel is rejected instead of moving silently. NoSubscriberBehavior.Pause stops consumption without a subscriber. Disconnection destroys the state.

## Progression and race protection

playNext prevents overlapping loads and chooses a queued track or random search result. Generation checks stop old asynchronous results from restarting playback after stop/mode changes. On Idle, normal playback clears the current track and starts the next. Enqueue acknowledgment can therefore succeed before an audio failure occurs.

skip stops the current stream and allows Idle progression. stop increments generation, disables random/radio, clears queue/current and stops audio, retaining the connection. leave destroys the connection and removes the Map entry. pause/resume control the player.

Random mode searches one of several Thai music topics on SoundCloud and excludes recently used URLs. It is not Spotify or a curated recommendation API. Radio mode clears the queue and random mode. On radio Idle, a five-second retry checks that the same state/station remains before restarting. Mode transitions matter because timers and async searches can finish after a user has changed intent.

# 09 Radio frequency, area and discovery

## A frequency is not a stream

107.75 is an FM label, not an internet address. Different provinces reuse frequencies. The bot has no tuner; it needs an online HTTP/HLS stream. A station without a discoverable feed cannot be played merely by entering its frequency.

radio-directory.js combines a known-station catalog, regional aliases and Radio Browser's Thailand directory. The request times out after eight seconds and results are cached ten minutes. lastcheckok = 1 is a directory check result, not a current audio measurement.

## Matching

/radio list merges catalog matches with popular directory entries and limits the displayed set. /radio play first checks catalog aliases/name/frequency, then directory name/tags and area hints. Similar candidates can cause a request for a more precise name rather than an arbitrary choice. Metadata may be incomplete, and country/region coverage is not guaranteed.

FFmpeg opens the selected URL directly with reconnection options and converts to PCM. HTTP success can still mean silence, an advert or a wrong feed. Record selected name/URL, FFmpeg stderr, player status and whether other stations work. A dynamic directory avoids preparing every station manually, but does not manufacture nonexistent streams.

The original frequency parser's behavior is retained by this structural refactor. Parser correctness and live-audio acceptance are separate changes: a station lookup result must not be presented as proof of audible playback.

# 10 Calendar data and timezone semantics

## Base event versus occurrence

An events row stores the base definition: title/description, start/end, all-day/holiday flags, recurrence, reminders, mode, color, guild and creator. Query expansion adds occurrence_at/occurrence_end for each visible instance. A repeated event keeps the same ID, so public/frontend identity also uses occurrence time.

## Validation

saveEvent caps titles at 160 characters and descriptions at 2,000, accepts six-digit hexadecimal colors and defaults to #4285f4. Recurrence is none/daily/weekly/monthly/yearly. Minute offsets must be integers from zero to 10,080; at most five are accepted. Invalid dates/order/color throw validation errors.

All-day form endDate is inclusive, but storage end is exclusive next midnight. A one-day event on 13 October ends at the start of 14 October. Timed input without an end defaults to one hour. This convention makes interval overlap comparisons consistent.

## Thai time

localDateTimeToIso accepts Gregorian YYYY-MM-DD HH:mm in Bangkok and converts to UTC ISO. Helpers encode Thailand's UTC+7 assumption. UI may show Buddhist Era years; stored ISO remains Gregorian. 07:00 Thai time equals 00:00Z, not 07:00Z. Do not put a displayed Buddhist year into an ISO Gregorian date or subtract the offset twice.

A visitor abroad still sees the project's Thai timezone. Keeping storage as an instant and presentation as a chosen timezone avoids ambiguous strings that depend on whichever machine happens to read them.

# 11 Recurrence and holiday expansion

## Local calendar arithmetic

recurrence.js extracts Bangkok date parts. Daily/weekly advance one/seven days. Monthly advancement preserves the original anchor day and clamps shorter months: an event on the 31st can use February's last day and return to the 31st later. Yearly advancement handles month lengths too. It skips near the requested window rather than walking every historical occurrence, and limits expansion to 800 iterations.

Queries reject invalid/reversed ranges or windows over 400 days. An occurrence overlaps if its end is after the window start and its start is before the window end. Long events beginning before the visible period can therefore still appear.

## Generated system events

holidays.js combines date-holidays, explicit Thai important dates and holy-days.json. System holidays are generated for requested years rather than stored as custom event rows. IDs contain date and a title hash. They use standard reminders and category tagging. holy-days.json has a finite precomputed year range; it is not an eternal official calendar. Exceptional government declarations and lunar dates require maintained data.

Categories include public, substitute, bank, Buddhist, holy, royal, festival, Thai, international and custom. Some classification uses title patterns and an event can have several tags. Browser filters hide displayed items; reminder filters control server notifications. They do not delete events. This refactor preserves the existing holiday dataset rather than certifying completeness.

# 12 Reminder schedules and delivery guarantees

## Candidate times

Standard/all-day events default to noon on the previous day and 07:00 on the event day. Timed standard events use actual start for the day-of reminder. Guild options can change times or disable either schedule. Offset mode subtracts each minute offset from occurrence start.

The scheduler ticks immediately and every twenty seconds, expands eight days on either side of now, filters configured guild/channel/category settings and checks due schedules. A one-hour recovery window catches recent misses after restart but does not replay all old history. Busy prevents overlapping ticks in this process.

## Deduplication, not exactly once

calendar_deliveries uniquely identifies guild/channel/event/occurrence/schedule. sendCalendarNotification checks for a row, sends to Discord and stores message ID/payload. Legacy reminder_log checks some offset deliveries. Repeated normal ticks do not resend recorded deliveries.

If Discord accepts a message and the process crashes before recording it, a later tick can resend. Multiple processes can race between check and insert. One production process is the intended model.

## Changes after delivery

Updating an event clears legacy reminder_log but not all calendar_deliveries. Renaming an already delivered occurrence does not automatically resend its existing delivery key. Event deletion cascades event-linked legacy logs; textual delivery records may remain for message/button handling. These are current semantics, not a full audit/retention policy. Decide resend and cleanup behavior explicitly before implementing it.

# 13 Discord embeds, buttons and deep links

## Channel message

notifications.js constructs an embed using guild color, template and a by Double_P footer. Placeholders are title/date/schedule/description/category. showDetails controls description insertion; template and final text are bounded. allowedMentions parse: [] avoids automatic mass pings from event text.

The Calendar button carries a stored delivery ID. calendar_latest remembers the latest message per channel. Older active messages have components removed while their text remains. Deleted Discord messages are marked inactive.

## Ephemeral details

Clicking Calendar defers a private reply, loads the delivery payload and shows Open Calendar plus Dismiss. Dismiss includes the user's ID and rejects another user's custom ID. A thirty-second in-memory timer attempts to remove the private response. A process restart can cancel that timer; deletion is not durable background scheduling.

calendarUrl builds /calendar with date, event and at parameters. date selects the Thai day; event identifies the base event; at selects a repeated instance. The public client can navigate and open details. The link is public, not an admin login link. Configure the public URL, not a private LAN panel address.

Delivery payloads capture content at send time. An event edited later can differ from that historical snippet. Keep notification history and current calendar state conceptually separate.

# 14 SQLite explained and configured

## Embedded but persistent

SQLite runs inside the application and opens a local file. There is no MySQL service, database port or database account to create. Tables and SQL still exist; embedded does not mean temporary. DATABASE_PATH selects the actual file. DATA_DIR stores initial credential files and does not relocate the database. Relative paths depend on working directory; use repository-root startup or absolute server paths.

connection.js creates the directory and opens DatabaseSync. schema.js creates missing tables and checks event columns before adding reminder_mode/color. This is additive compatibility logic, not a numbered general migration system. Editing CREATE TABLE does not change existing column types. Plan a migration and backup for structural changes.

## WAL and concurrency

WAL journal mode, synchronous NORMAL, foreign_keys ON and busy_timeout 5000 are configured. WAL permits convenient coexistence of readers and a writer; writes remain serialized and calls here are synchronous. It is not a replicated database cluster or a shared-network-file protocol.

The .sqlite file may have -wal/-shm sidecars. They are normal live files, not garbage to delete while running. Do not copy only the main file for an online backup. The application does not encrypt SQLite: password hashes are protected against direct password recovery, but event text/settings/delivery content remain readable to anyone with file access. Keep the database and backups private.

# 15 Tables, keys and persisted settings

## Identity

users holds unique username, password_hash, role, must_change and creation time. sessions holds token_hash, user foreign key, csrf and expiry milliseconds. User deletion cascades sessions. Browser raw tokens are not stored as database keys.

## Calendar

events stores base custom definitions; created_by can reference a web user, while Discord creation uses null. guild_id null is not restricted to one guild. guild_config chooses channel/default offset per guild. app_settings is string key/value storage for bot_enabled, public URL, user preferences, guild reminder options and publisher state.

reminder_log is an event-linked compound-key legacy log. calendar_deliveries stores textual event identity, occurrence, schedule, channel, message ID, payload and active status. Its compound uniqueness supports send deduplication. calendar_latest stores one latest message per channel.

## Queries and types

Indexes support starts_at, guild and active channel-delivery lookups. Parameter binding keeps user values separate from SQL syntax. Settings are strings even when logically JSON, numbers or booleans. Consumers must parse and normalize. Missing settings return null; malformed preferences/options fall back.

Document each new setting's owner, default and parse behavior. Do not let the key/value table become an undocumented dumping ground. The relationship diagram shows which tables have foreign keys and which merely contain textual external IDs; those differences explain why some records cascade on deletion and others remain.

[Technical diagram included in the PDF edition]

Technical diagram drawn from project behavior; chapter text explains limitations.

# 16 Passwords and authenticated sessions

## Bootstrap

Missing admin/viewer accounts are created, existing accounts preserved. A fresh admin can use ADMIN_INITIAL_PASSWORD of at least ten characters or a generated random password saved privately. must_change requires the first password change. Bootstrap configuration does not reset an existing admin.

passwords.js uses scrypt, a random 16-byte salt, N 32768/r 8/p 1 and 64 derived bytes. The packed hash carries parameters/salt/key. Verification recalculates and uses a timing-safe comparison. Hashing is verification, not reversible encryption.

## Sessions and cookies

createSession generates a 32-byte random browser token plus a separate 24-byte CSRF token. SQLite stores SHA-256 of the browser token, not its raw value, with eight-hour expiry. The session cookie is HttpOnly, SameSite Strict, Path / and Secure when Express detects HTTPS. JavaScript obtains the CSRF value from the authenticated session endpoint.

Logout removes the session and clears its cookie. Password change invalidates the user's sessions and creates a replacement. Expired sessions are removed when presented; no global periodic session cleanup exists.

LAN HTTP and Tailscale HTTPS are different origins. Cookies and localStorage preferences do not automatically move between them. A successful login at one address does not imply login at another. Never add credentials to a public snapshot to make login seem easier; public viewing intentionally needs no admin account.

# 17 Authorization, CSRF and channel setup PIN

## Access pipeline

Protected reads use auth. Admin mutations use auth, admin, csrf: resolve session, verify role/password-change state, then validate x-csrf-token. Viewers cannot use admin control routes. A mustChange admin receives 428 until changing password.

CSRF protects against an unwanted request sent by an already authenticated browser. It is different from password guessing. SameSite Strict plus a session-specific header reduce this threat. The code uses timingSafeEqual; a future hardening should compare byte lengths safely before calling it, rather than character lengths for arbitrary Unicode input.

## Pre-login and rate limiting

The login page sets a short-lived tutel_pre cookie whose value must be echoed in login JSON. Failed attempts are tracked by IP in a Map. Restart clears it and replicas do not share it; this is not MFA or durable attack auditing.

## PIN scope

CALENDAR_SETUP_PIN gates selecting/changing a Discord reminder channel. /calendar setup requires it; the web route checks it when channel changes. It is not required for normal event creation and is different from admin password and CALENDAR_SYNC_SECRET.

Existing Discord calendar add/delete/config handlers do not implement a separate admin-role policy. Delete is guild-scoped. PIN is not complete command authorization. Decide allowed roles as a separate feature instead of claiming that a protected channel setup protects every calendar operation.

# 18 Express routes and browser security

## Composition

server.js creates Express, trusts loopback proxies, disables x-powered-by, applies Helmet, limits JSON to 32 KB and sets no-store. It registers focused page/auth/event/preference/assets/sync/Discord/bot/health modules. Route paths and middleware order remain compatible after extraction.

Pages redirect missing sessions to login and roles to their own view. Static files are explicitly allowed rather than exposing the repository. The legacy publicEvent export remains, while real snapshot serialization belongs to calendar/public/snapshot.js.

## CSP and proxy behavior

Content Security Policy restricts scripts/styles/connections to same origin and blocks framing/objects. Adding CDN or inline code can fail under it. Solve a specific requirement instead of weakening all directives. Tailscale Serve provides HTTPS and proxies locally; trusted loopback forwarding lets Secure cookies behave correctly.

## Status and error meaning

Validation usually returns 400, missing session 401, forbidden role/CSRF 403, required password change 428, offline bot conditions 503 and public-sync failure 502. Route-local catches remain; this is not a complete centralized JSON error layer. Unhandled errors can reach Express defaults.

/api/health only reports HTTP availability. It does not certify Discord readiness, radio audio, database backup validity or last successful sync. The endpoint appendix describes actual auth and output, including legacy property names retained for client compatibility.

# 19 Calendar UI, colors and mobile behavior

## Browser roles

app.js owns authenticated event editing, notification settings and bot controls. calendar-view.js supplies shared month/week/day/agenda rendering. preferences.js owns theme/category preferences. Public calendar.js loads a read-only API snapshot. These are classic browser scripts, not Node modules.

All views display occurrences. Month cells stack event bars; timed views can position overlaps; selected-day details and event dialogs provide more context. Admin cell actions prefill a chosen date. Display filters do not alter stored events.

## Theme versus event data

Device theme is default until explicitly changed. app.css defines theme tokens, controls, dialogs and responsive overrides. Event color defaults blue and is stored per event. Discord embed color is a separate guild setting. Choosing blue for an event should not make the entire app blue.

The stylesheet has accumulated overrides. This refactor formats and centralizes it but preserves cascade order; blindly reordering selectors can break mobile/timed layouts. A separate visual redesign should review all views and breakpoints.

Touch navigation changes calendar periods. Desktop wheel navigation is scoped to calendar behavior; dialogs and scrolling lists must remain usable. Long web event text clips to available space without changing Discord ellipsis. Search/view/theme controls should remain aligned and large enough to tap. Saved preferences are origin-specific; public and admin addresses can therefore have different saved themes.

# 20 Shared assets, manifest and offline behavior

## Canonical assets

Edit app.css, calendar-view.js, preferences.js, icon.png, app-icon.png and manifest.webmanifest under src/web/public. npm run assets:sync copies these six files to vercel-public/netlify-public using a root resolved from the script URL. Generated copies remain in Git for independent deployment.

Provider-specific index.html, calendar.js, sw.js, API and config are not copied. This prevents the legacy static-JSON Netlify client overwriting the API-based Vercel client. Editing a generated copy alone will be overwritten next sync.

## Installable app

The manifest defines Tutel's installed name, icons and launch mode. icon.png is the original turtle; app-icon.png adds a designed background. generate-app-icon.ps1 uses Windows System.Drawing and is maintenance tooling, not a server runtime requirement.

Admin workers cache only selected visual assets, not authenticated HTML/API. Public workers cache public assets and /api/calendar for offline fallback. Network-first reads favor fresh responses; activation removes old Tutel cache versions. Offline content is last-known, not current guaranteed data.

Remote service workers require a secure context; localhost has development exceptions. Installation behavior depends on browser/platform and is not guaranteed every visit. No persistent +App button is required. Changing cache versions helps stale assets retire, but does not replace careful data/cache reasoning.

# 21 Public projection and snapshot generation

## Field boundary

Internal events contain guild scope, creators and reminder settings. publicEvent in calendar/public/snapshot.js explicitly selects ID/title/description, all-day/holiday/publicHoliday, recurrence, base/occurrence dates, systemHoliday, categories and color. It excludes accounts, session hashes, channel configuration and delivery records. A field allowlist is not a privacy classifier: all expanded custom events are included.

## Time range and identity

buildSnapshot uses the current Bangkok year and expands previous/current/two following years. The end boundary is exclusive at the start of the next year. ID plus occurrence timestamp deduplicates, then entries sort by occurrence time. Output has timezone/from/to/generatedAt/events.

exportSnapshot writes calendar.json under PUBLIC_SITE_DIR. If meaningful content excluding generatedAt is unchanged, it keeps the existing snapshot/time. Changed content is written to .tmp and renamed, reducing partially written reads in the intended single-process workflow.

The staging JSON is ignored by Git and is not the live Vercel browser endpoint. Public clients read /api/calendar. Code releases and calendar data writes are independent. A generated four-year projection is useful for browsing; it is not a permanent archive of every past event.

When adding a new internal field, decide whether it belongs in this public allowlist. Omitting a field can preserve privacy; adding it should be a conscious contract change coordinated with receiver validation and browser rendering.

# 22 Outbound sender and retry state

## Scheduling

publish.js starts immediately and repeats every sixty seconds. Web event mutations request a five-second debounce to combine rapid edits. Discord mutations are caught by the periodic fallback. Busy permits one tick. Failure stores an error and delays retries exponentially from fifteen seconds to five minutes.

api-sync.js requires HTTPS without embedded URL credentials and a separate CALENDAR_SYNC_SECRET. It hashes timezone/range/events and compares successful hash plus endpoint. Normally unchanged data skips POST. Forced sync bypasses this optimization.

## Monotonic revisions

New content gets a revision greater than saved/pending revision and at least the current millisecond clock. Pending hash/revision is persisted before sending. Retrying the same content reuses it. The body adds schemaVersion 1 and generatedAt; headers use Bearer secret and application/json with thirty-second timeout.

Success updates successful hash/endpoint/revision/time and clears error. A 409 with the receiver revision advances pending revision for the next retry. Failure does not replace the last successful hash. If configuration is absent, pending is returned rather than inventing credentials.

The house initiates outbound HTTPS. NAT and changing home IP are not write-identity dependencies. During home outages the public calendar keeps the last snapshot; data synchronizes later. This is eventual consistency, not a distributed database transaction. The sequence diagram separates local commit, authenticated upload and later browser observation.

[Technical diagram included in the PDF edition]

Technical diagram drawn from project behavior; chapter text explains limitations.

# 23 Vercel receiver, schema and Blob concurrency

## Authenticated write

POST /api/calendar/sync accepts POST only, checks secret/Blob configuration, compares hashed authorization using timingSafeEqual, requires JSON and caps serialized input at two million bytes. It validates and stores; statuses distinguish method/auth/content-type/size/shape/stale/storage failures.

validateSnapshot requires schemaVersion 1, positive safe revision, Asia/Bangkok, parseable generatedAt, date-range labels and at most 10,000 events. Each event has an ID, bounded nonempty title/string description, valid base/occurrence date strings and positive occurrence duration. Color/category shapes are checked. Unknown event fields are removed and contentHash recomputed.

Validation is structural: it does not ensure every occurrence lies inside from/to or every category is a known catalog ID. New integrations should not infer stricter checks than exist.

## Private Blob

store.js uses calendar/latest.json. Server-to-store authentication uses connected BLOB_STORE_ID/OIDC or a read/write token. The home's shared secret authenticates HTTP to Vercel, not Blob access directly. Public visitors do not get either credential.

saveSnapshot rejects older revisions. Equal revision/equal hash returns unchanged; equal revision/different hash conflicts. Overwrites use current Blob ETag with ifMatch and retry races up to three attempts. Initial writes disallow overwrite. This avoids stale concurrent replacement without requiring a database server. Blob remains object storage, not SQL tables or a distributed scheduler.

# 24 Public reads, cache layers and cost model

## Read contract

/api/calendar supports GET/HEAD. It reads private Blob server-side and serves sanitized JSON or headers. ETag uses contentHash; matching If-None-Match returns 304. Missing first snapshot and storage failures return 503. The private Blob URL is not the visitor-facing API.

## Freshness

Headers use browser max-age 0, CDN s-maxage 60 and stale-while-revalidate 60. The client polls each minute and on returning to the tab; a worker offers last-successful offline fallback. An edit passes local commit, debounce, upload, CDN revalidation and browser polling. Those stages mean immediate visibility is not guaranteed. Failures/background scheduling/backoff can extend the delay.

Distinguish generatedAt, server lastSync and browser fetch time. Inspect API revision when a page appears stale; repeatedly deploying source is not the correct response to every data-sync problem.

## Cost

Data writes no longer create website builds. They still consume function execution, Blob operations/storage and bandwidth. Hash skips, idempotency, CDN cache and conditional requests reduce work but do not make it free. A 304 can still cause origin access depending on cache.

A savings percentage requires measured visitors, edit rate, snapshot size and current plan pricing. The architectural benefit is separating source deployment from data synchronization, not a claimed fixed credit saving. Use Vercel usage measurements for financial decisions.

# 25 Environment variables and secret ownership

## Configuration groups

Discord: DISCORD_TOKEN/CLIENT_ID/GUILD_ID. Media: YT_DLP_PATH/FFMPEG_PATH/MUSIC_SEARCH_PREFIX. Local runtime: CONTROL_HOST/PORT, DATABASE_PATH, DATA_DIR. Bootstrap/access: ADMIN_INITIAL_PASSWORD and CALENDAR_SETUP_PIN. Public data: PUBLIC_CALENDAR_URL/SITE_DIR/DEPLOY_PROVIDER, CALENDAR_SYNC_URL/SECRET.

Production provider is calendar-api. VERCEL_TOKEN/project/team identify legacy direct source-deployment tooling, not the data sender. Netlify values belong to the legacy provider. Vercel public runtime needs shared sync secret plus its connected Blob authentication, not Discord token.

Never put secrets in frontend JS/HTML/manifest, public JSON or client-exposed environment variables. The shared sync secret should be random and independent of admin password or short PIN. Changing only one side causes 401; both runtimes must use the matching new value.

## Safe editing

Copy .env.example only for a fresh clone. Do not overwrite an existing configured .env. Paths with spaces may be quoted; a path value identifies an executable, not an entire shell command. Windows and Linux media paths differ. Relative data paths depend on process working directory.

.gitignore avoids accidental tracking but cannot remove already committed secrets or prevent forced addition. Review staged files. Never print a whole production .env as a troubleshooting shortcut. The environment appendix documents each safe key without copying real values.

# 26 Local installation and development workflow

## Windows

Use Node 24+, npm and an accessible yt-dlp executable. In D:/tutel-bot, npm ci installs root dependencies from the lockfile. npm install is for deliberate dependency changes. Install/update yt-dlp separately. ffmpeg-static provides FFmpeg unless overridden.

For experiments select a separate DATABASE_PATH/DATA_DIR, leave live Discord credentials blank and do not enable production public writes. npm start opens the control panel and schedules background services. A fresh database writes private initial credentials; first login requires changing password. Missing Discord token is logged while the panel stays available. Guild/channel controls need a ready bot.

## Standalone public project

vercel-public owns package.json/lockfile for its API. Root installation does not install its Blob dependency; run npm ci inside that directory when needed. Opening index.html through file:// does not create /api/calendar. A server/hosting runtime is required for API behavior.

## Editing loop

Edit authoritative source, format it, run assets:sync for shared browser changes, inspect diff and update docs when contracts change. Formatting and syntax parsing are not acceptance tests. Do not log into the production bot merely to check indentation.

Examples in the command appendix explain where to run commands and what each changes. Keep an existing local database intact; choosing a new test path is safer than deleting the original to obtain a fresh install.

# 27 Homeserver rollout and Tailscale access

## Existing production paths

Application source and private .env live under /home/doublep/tutel-bot/app. SQLite is under /home/doublep/tutel-bot/data. A separate public staging folder holds generated snapshots. The active service is tutelbot.service; deploy/tutel-hub.service in the repo is a generic template that must match the actual working directory.

## Rollout

Back up source and take a consistent SQLite snapshot first. Transfer a candidate without env/private/data/node_modules. Install from lockfile on the target. Review parsing/module paths, stop the active service, apply source, restart and observe logs. Keep the previous archive for rollback. Do not reset DB to solve an import error. Production npm installs omit formatting dev tooling, and external yt-dlp must still be accessible to the service.

CONTROL_HOST selects bind address. LAN access uses the home address; loopback can sit behind a trusted proxy. Tailscale Serve supplies HTTPS for tailnet devices. Public visitors are not automatically tailnet members. The outbound sender does not require inbound port forwarding.

## DNS issues

If the tailnet hostname does not resolve, check client Tailscale connection/login/MagicDNS before changing HTML. Browser secure-DNS overrides can interfere with private names. HTTP LAN and HTTPS tailnet are different origins and sessions. Admin reachability and public read-only calendar reachability are separate tasks.

# 28 GitHub and Vercel releases

## Source deployment versus data sync

GitHub stores source, safe examples, locks and docs. A connected push can trigger Vercel builds. Event updates write Blob through API without Git. Receiver code changes still require a source release.

The local public folder is vercel-public. Vercel Root Directory must match after rename; framework Other, install npm ci --omit=dev, output '.', functions under api. Deploying the repo root incorrectly mixes bot/admin materials with public hosting. Local folder rename does not update platform settings.

vercel.json's ignoreCommand recognizes [skip vercel] in a commit message. Such commits can update GitHub without a build. A normal release should omit that marker. Preserve environment/store connections while changing the root.

## Git sequence

status and diff inspect; add selects; diff --cached --name-only lists the exact staged files; commit records; push sends commits. Staging is not upload/deploy. A clear message is refactor: organize application modules and add bilingual handbooks. Review staged files for secrets and data, not just filename count.

Repository-not-found can indicate URL or permissions. HTTPS Git uses supported credentials, not ordinary password authentication. Avoid inserting tokens into remote URLs. A completed push and a READY deployment prove source delivery, not correct audible playback or fresh calendar data.

# 29 Backup, restore and release rollback

## Consistent backup

npm run db:backup checks source existence and new destination, then uses SQLite VACUUM INTO with a busy timeout. This creates a consistent database snapshot rather than copying only a main file during WAL activity. Names use filesystem-safe timestamps. Keep env backups separately and securely: DB contains accounts/events/settings, not environment tokens or executables.

## Restore

Stop every writer. Preserve current database and paired sidecars in a separate recovery folder. Put the selected consistent backup at DATABASE_PATH without stale WAL/SHM. Confirm permissions, start and inspect. Never restore over a live file.

An older backup restores older passwords/sessions/configuration/delivery history. Deduplication and public/home revision differences can therefore change. Decide whether to force-sync recovered state. A restart alone does not resolve every data conflict. Keep a second backup location if home disk loss matters.

## Code rollback

Stop service, restore previous source/lock, install matching dependencies if needed, restart. Additive schema changes are generally friendlier than destructive migrations, but future schema changes need compatibility planning. Current refactor preserves table meaning. Frontend rollback can require a fresh asset load/cache-version update.

Backup creation is not the same as a tested recovery procedure. Verify recoverability on an isolated path when doing an explicitly planned recovery exercise, never by overwriting production just to check the file.

# 30 Troubleshooting and operational evidence

## Follow the failing layer

Startup failure: inspect Node version, imports/dependencies, DB permissions and bind address. HTTP works but bot offline: inspect token/bot logs. Commands absent: inspect application identity, registration scope and invite. Music acknowledged but silent: inspect search, yt-dlp exit, FFmpeg PCM, player and voice permissions. A missing Opus module is an installation issue; a Windows Application Control block is an OS-policy issue. Do not disable security policy blindly.

Channel loading needs a ready bot and correct permissions. Admin 401 means session/login; 403 may mean role/CSRF/PIN; 428 means password change. Public write 401 means credentials disagree; 409 means revision conflict; 503 can mean configuration, first-sync waiting or storage failure.

For stale public pages compare admin data, lastSync/error, API revision and browser network/cache. Source deployment does not guarantee data sync. For radio record selected URL/station and FFmpeg output; directory lastcheckok does not prove sound.

## What evidence proves

Ready proves Discord login. /api/health proves HTTP response. READY proves deployment finished. None proves audible music or every reminder delivered. PCM activity proves decoded bytes, not that a listener heard them. End-to-end listening and actual notification checks require distinct acceptance work.

Redact cookies, tokens, Authorization and private env values from diagnostics. Record timestamps and IDs instead. Make a change at the failing layer rather than introducing unrelated code churn.

# 31 Maintenance, extension recipes and limits

## Style and tooling

.editorconfig sets UTF-8/LF/two spaces/final newline. Prettier sets width 100, semicolons, single quotes and trailing commas. format writes; format:check reports. Private/generated large data and lockfiles are excluded appropriately. Use responsibility names and explain non-obvious decisions, not every obvious statement.

Add a command by updating definitions, implementing its handler group, deciding permissions/acknowledgment and registering after deployment. Add an event field across schema, save validation, expansion, optional public projection/receiver validation and browser/docs. Changing only a form can create a field that never persists. Add routes with explicit auth/role/CSRF/status contracts and avoid importing the top-level server back into services.

## Current limits

Queues/timers are in memory; reminders are best-effort deduplicated; holidays need maintenance; radio needs online feeds; all exported events are public; SQLite is single-host; Discord calendar authorization is limited; route-local error handling and CSRF byte-length handling can improve. CSS override order remains; asset changes require sync. No full CI/browser/audio suite is added merely by refactoring.

Monitor Node/FFmpeg/yt-dlp memory separately, update media extractors intentionally, curate broken streams and future holidays, keep backups/log retention. Future visibility flags, role controls, numbered migrations, isolated regression coverage and sync-age alerts are recommendations, not implemented features. Choose them with explicit requirements rather than overcomplicating a small installation.

# Appendix A File-by-file code map

Each entry identifies responsibility and declared function names. Read it with the behavioral chapters; names alone are not the implementation contract. Images are assets, and private runtime content is excluded.

## .editorconfig

Editor indentation, encoding and line ending conventions.

## .env.example

Safe empty credential template plus example service/media/sync settings.

## .gitignore

Excludes credentials, databases, backups, generated snapshots and caches.

## .prettierignore

Formatting exclusions for private/runtime/generated material.

## .prettierrc.json

Shared automatic formatting rules.

## compose.yaml

Optional constrained container with private data/public staging mounts and loopback port.

## deploy/tutel-hub.service

Generic user-service template; adapt WorkingDirectory to deployment layout.

## Dockerfile

Optional Node/system-FFmpeg/Python-yt-dlp container running as nonroot.

## netlify-public/\_headers

Provider hosting/cache/routing or upload exclusion rules.

## netlify-public/\_redirects

Provider hosting/cache/routing or upload exclusion rules.

## netlify-public/app.css

Generated shared asset; edit src/web/public and run assets:sync.

## netlify-public/calendar-view.js

Generated shared asset; edit src/web/public and run assets:sync.

Declared functions: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## netlify-public/calendar.js

Legacy read-only static calendar.json client, not API sync receiver.

Declared functions: toast, occursOn, showDetails, selectDay, renderList, renderCalendar, changeMonth, loadSnapshot, dateKey, today, validDay, esc

## netlify-public/index.html

Public/provider support asset; see corresponding hosting/frontend chapter.

## netlify-public/manifest.webmanifest

Generated shared asset; edit src/web/public and run assets:sync.

## netlify-public/preferences.js

Generated shared asset; edit src/web/public and run assets:sync.

Declared functions: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## netlify-public/sw.js

Legacy public cache for the static snapshot provider.

## package-lock.json

Exact root dependency graph for reproducible npm ci.

## package.json

Root commands, engine requirement and bot/admin runtime/dev dependency declarations.

## scripts/backup-db.js

Consistent VACUUM INTO backup to a new private destination.

## scripts/generate-app-icon.ps1

Windows drawing utility for the background of installed-app turtle icon.

## scripts/sync-public-assets.js

Copies six canonical browser assets to standalone provider directories.

## src/auth/accounts.js

Bootstraps missing accounts, looks up users and changes passwords.

Declared functions: initializeAccounts, userByName, changePassword

## src/auth/passwords.js

Encodes salted scrypt hashes and timing-safe verification.

Declared functions: decode, encode, hashPassword, verifyPassword

## src/auth/sessions.js

Creates hashed-token sessions, resolves expiry and deletes sessions.

Declared functions: createSession, getSession, deleteSession

## src/bot/runtime.js

Owns the singleton Discord client, startup promise, interaction dispatch and stop.

Declared functions: getDiscordClient, botStatus, startBot, stopBot

## src/integrations/calendar/legacy/api-sync.js

Hashes changed data, persists revision state and POSTs authenticated snapshots.

Declared functions: syncCalendarApi

## src/integrations/calendar/legacy/categories.js

Defines category vocabulary and title-based system classification.

Declared functions: eventCategories

## src/database/connection.js (store), src/database/settings.js (settings), src/auth/ (accounts/sessions)

Compatibility exports for database/auth/settings callers.

## src/integrations/calendar/legacy/events.js

Validates and persists custom events; merges generated holidays and guild config.

Declared functions: listExpandedEvents, saveEvent, deleteEvent, saveGuildConfig, listGuildConfigs

## src/integrations/calendar/legacy/holidays.js

Combines holiday library, fixed/derived important dates and lunar data.

Declared functions: thaiImportantDays

## src/integrations/calendar/legacy/holy-days.json

Finite precomputed lunar/holy-day dataset; maintain its year coverage.

## src/integrations/calendar/legacy/notifications.js

Sends embeds, records deliveries and manages latest/private buttons.

Declared functions: calendarUrl, removeOldCalendarButtons, sendCalendarNotification, handleCalendarButton

## src/integrations/calendar/legacy/options.js

Normalizes notification categories/times/colors/templates and filters events.

Declared functions: normalizeOptions, reminderOptions, saveReminderOptions, shouldNotify, notificationText

## src/integrations/calendar/legacy/public/archive.js

Builds allowlisted stored ZIP entries and CRC32 for legacy Netlify.

Declared functions: publicZip, crc32

## src/integrations/calendar/legacy/public/snapshot.js

Defines public field projection, four-year expansion and atomic JSON export.

Declared functions: publicEvent, buildSnapshot, exportSnapshot

## src/integrations/calendar/legacy/publish.js

Orchestrates snapshot export, provider selection, debounce and retries.

Declared functions: publishSnapshot, publicSyncStatus, requestCalendarSync, syncCalendarNow, startCalendarPublisher, syncPrefix, tick

## src/integrations/calendar/legacy/recurrence.js

Converts Thai local time and expands anchored recurring occurrences.

Declared functions: localDateTimeToIso, addLocal, fromLocal, eventOccurrences, formatThai, dateParts

## src/integrations/calendar/legacy/reminders.js

Builds due schedules and runs nonoverlapping twenty-second ticks.

Declared functions: reminderSchedules, runReminderTick, startReminderScheduler, tick

## src/integrations/calendar/legacy/service.js

Compatibility exports for events, recurrence and reminders.

## src/integrations/calendar/legacy/setup-pin.js

Hashes PIN comparison and throttles failed attempts per caller key.

Declared functions: checkCalendarSetupPin, hash

## src/integrations/calendar/legacy/vercel-publish.js

Legacy deployment adapter; not the current API data receiver deployment path.

Declared functions: publishVercel

## src/commands/calendar.js

Implements setup/add/list/delete/config/test with guild scope.

Declared functions: calendar

## src/commands/definitions.js

Defines slash names, subcommands, options and input bounds.

## src/commands/handlers.js

Combines command families through a stable dispatch facade.

## src/commands/music.js

Resolves/enqueues tracks and exposes playback/queue/random controls.

Declared functions: play, randommusic, queue, skip, stop, pause, resume, nowplaying, leave

## src/commands/radio.js

Matches station/area, shows candidates and switches the player to radio.

Declared functions: radio

## src/commands/shared.js

Provides guild-only validation and duration display helpers.

Declared functions: duration, guildOnly

## src/database/connection.js

Creates directory, opens DatabaseSync and invokes schema initialization.

## src/database/schema.js

Owns SQL tables/indexes, PRAGMAs and additive event-column upgrades.

Declared functions: initializeSchema

## src/database/settings.js

Reads/upserts string values under named application setting keys.

Declared functions: setting, setSetting

## src/deploy-commands.js

Validates registration credentials and sends global or guild command definitions.

## src/index.js

Composes accounts, schedulers, HTTP and optional bot; handles signals.

Declared functions: shutdown

## src/music/player.js

Owns per-guild in-memory state, queue transitions, modes and cleanup.

Declared functions: getState, ensureConnection, playNext, enqueue, enableRandomMode, playRadio, getPlayer, pausePlayer, resumePlayer, skip, stop, destroyPlayer

## src/music/radio-directory.js

Provides catalog, regional aliases and cached Radio Browser queries.

Declared functions: getRadioDirectory, stationMatchesRegion, stationFrequency, norm

## src/music/stream.js

Spawns yt-dlp/FFmpeg, parses metadata and creates raw resources.

Declared functions: resolveQuery, resolveTrack, resolveRandomTrack, createTrackResource, createRadioResource

## src/web/channels.js

Checks sendability/permissions and produces permitted channel choices.

Declared functions: canSendReminders, sendableChannels

## src/web/middleware/security.js

Shared cookies, session authentication, admin checks and CSRF.

Declared functions: cookies, clearCookie, auth, admin, csrf, setSessionCookie

## src/web/public/app.css

Canonical theme/layout/component styles; existing cascade order is preserved.

## src/web/public/app.html

Authenticated panel markup, calendar, dialogs and setting controls.

## src/web/public/app.js

Admin UI state, HTTP wrapper, forms, settings and bot actions.

Declared functions: esc, api, toast, dayKey, fromIso, startOfWeek, init, forcePasswordChange, wire, showPage, loadEvents, renderCalendar, selectDay, renderEventList, openEvent, bkkInput, editEvent, saveEventForm, deleteCurrentEvent, loadGuilds, loadSettings, loadChannels, saveSettings, loadBot, musicAction, toggleBot, field, occursOn, changeMonth, syncAllDay, showDetails, populateReminderOptions, readReminderOptions, previewNotification, updateChannelPin, syncEventColor, loadPublicSync

## src/web/public/calendar-view.js

Shared period navigation, month/time/agenda rendering and gesture/layout behavior.

Declared functions: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## src/web/public/login.html

Login document and accessible form/branding markup.

## src/web/public/login.js

Submits credentials with pre-login token and follows role redirect.

Declared functions: cookie, loadToken

## src/web/public/manifest.webmanifest

Installed-app identity, launch presentation and turtle icons.

## src/web/public/preferences.js

Shared saved theme/filter controls and install/launch-related browser behavior.

Declared functions: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## src/web/public/sw.js

Admin visual-only network-first cache; excludes private HTML/API.

## src/web/routes/assets.js

Explicit public asset allowlist; does not expose arbitrary source files.

Declared functions: registerAssetsRoutes

## src/web/routes/authentication.js

Login throttling, sessions, logout and password replacement.

Declared functions: registerAuthenticationRoutes

## src/web/routes/bot.js

Bot status/toggle and guild playback controls.

Declared functions: registerBotRoutes

## src/web/routes/calendar-sync.js

Reports publisher state and requests a forced sync.

Declared functions: registerCalendarSyncRoutes

## src/web/routes/discord.js

Guild/channel discovery, guarded channel configuration and actual test send.

Declared functions: registerDiscordRoutes

## src/web/routes/events.js

Authenticated event reads and admin mutations with sync requests.

Declared functions: registerEventsRoutes

## src/web/routes/health.js

Unauthenticated basic HTTP liveness response.

Declared functions: registerHealthRoutes

## src/web/routes/pages.js

Login pre-token and role-based page redirects/static entry scripts.

Declared functions: registerPagesRoutes

## src/web/routes/preferences.js

Persists per-user theme/filter preferences after normalization.

Declared functions: registerPreferencesRoutes

## src/web/server.js

Constructs secured Express and registers route families/listening lifecycle.

Declared functions: publicEvent, startControlServer

## vercel-public/.env.example

Safe environment template; fill secrets on the server, never publish values.

## vercel-public/.vercelignore

Provider hosting/cache/routing or upload exclusion rules.

## vercel-public/api/calendar/sync.js

Authenticated JSON write endpoint with method/type/size/shape validation.

Declared functions: handler, digest

## vercel-public/api/calendar.js

Public GET/HEAD, ETag/304 and CDN caching over private storage.

Declared functions: handler

## vercel-public/app.css

Generated shared asset; edit src/web/public and run assets:sync.

## vercel-public/calendar-view.js

Generated shared asset; edit src/web/public and run assets:sync.

Declared functions: escape, parts, key, date, startWeek, monthFirst, monthShift, format, overlaps, color, foreground, time

## vercel-public/calendar.js

Read-only client polling, details/day selection and deep links.

Declared functions: toast, occursOn, showDetails, selectDay, renderList, renderCalendar, changeMonth, loadSnapshot, dateKey, today, validDay, esc

## vercel-public/index.html

Public-only calendar shell and dialogs; no admin editing.

## vercel-public/lib/store.js

Blob I/O, allowlist validation, content hashes and conditional revision writes.

Declared functions: readSnapshot, validateSnapshot, saveSnapshot

## vercel-public/manifest.webmanifest

Generated shared asset; edit src/web/public and run assets:sync.

## vercel-public/package-lock.json

Exact standalone dependency versions; use npm ci in this folder.

## vercel-public/package.json

Standalone public dependency/scripts declaration; independent of root package.

## vercel-public/preferences.js

Generated shared asset; edit src/web/public and run assets:sync.

Declared functions: theme, persist, hideInstall, deferInstall, showInstall, refresh, safe

## vercel-public/sw.js

Public network-first/offline assets and API snapshot cache.

## vercel-public/vercel.json

Hosting headers, functions, calendar rewrite and skip-commit rule.

# Appendix B HTTP contracts and access

## POST /api/login

Access: no session required

Login throttling, sessions, logout and password replacement.

Implementation: src/web/routes/authentication.js

Body username/password/csrf. Echo the pre-login cookie; failures return 401/403 or throttled 429. Success sets an eight-hour cookie and returns role, mustChange and redirect.

## GET /api/session

Access: session

Login throttling, sessions, logout and password replacement.

Implementation: src/web/routes/authentication.js

Returns authenticated user ID/username/role/mustChange and CSRF. Use this CSRF for subsequent mutations; never send it publicly.

## POST /api/logout

Access: session + CSRF

Login throttling, sessions, logout and password replacement.

Implementation: src/web/routes/authentication.js

Requires the session CSRF header; deletes current hashed session and clears cookie. Returns ok.

## POST /api/password

Access: session + CSRF

Login throttling, sessions, logout and password replacement.

Implementation: src/web/routes/authentication.js

Body currentPassword/newPassword; verifies current password, requires at least ten new characters, invalidates old sessions and returns a new CSRF. Viewer and admin can change their own password.

## GET /api/bot

Access: admin + session

Bot status/toggle and guild playback controls.

Implementation: src/web/routes/bot.js

Returns status/configured, guild list and music summaries: playing, paused, queue length and voice channel. Queue details are in RAM.

## POST /api/bot/toggle

Access: admin + session + CSRF

Bot status/toggle and guild playback controls.

Implementation: src/web/routes/bot.js

Body enabled boolean-like value. Starts/stops Discord and persists bot_enabled on success; returns status. Stop destroys players; web/calendar keep running.

## POST /api/control/music

Access: admin + session + CSRF

Bot status/toggle and guild playback controls.

Implementation: src/web/routes/bot.js

Body guildId/action: pause/resume/skip/stop/leave. Missing player 404; unsupported action or impossible skip 400. Does not enqueue new tracks.

## GET /api/calendar-sync

Access: admin + session

Reports publisher state and requests a forced sync.

Implementation: src/web/routes/calendar-sync.js

Returns provider, configured flag, lastSync and persisted error. It reports sender status, not browser freshness.

## POST /api/calendar-sync

Access: admin + session + CSRF

Reports publisher state and requests a forced sync.

Implementation: src/web/routes/calendar-sync.js

No event body required. Forces current publisher/export path and returns result plus status; errors return 502 with status. Force can upload unchanged content.

## GET /api/guilds

Access: admin + session

Guild/channel discovery, guarded channel configuration and actual test send.

Implementation: src/web/routes/discord.js

Ready bot required (otherwise 503). Returns guild IDs/names, channel configs with reminder options, categories, publicCalendarUrl and legacy netlify property containing current provider status.

## GET /api/guilds/:id/channels

Access: admin + session

Guild/channel discovery, guarded channel configuration and actual test send.

Implementation: src/web/routes/discord.js

Requires cached guild; fetches permitted sendable channels. Missing guild 404; channel/permission loading failure 500.

## POST /api/settings/discord

Access: admin + session + CSRF

Guild/channel discovery, guarded channel configuration and actual test send.

Implementation: src/web/routes/discord.js

Body guildId/channelId/defaultReminder/publicCalendarUrl/options and secretPin when changing channel. Checks ready bot, membership and View/Send permissions; stores URL origin, config and normalized options. Validation returns 400; PIN rejection 403.

## POST /api/settings/discord/test

Access: admin + session + CSRF

Guild/channel discovery, guarded channel configuration and actual test send.

Implementation: src/web/routes/discord.js

Body guildId. Requires stored channel and ready bot, selects first upcoming event within thirty days and sends a real embed with test schedule key. This is an external side effect, not a dry run.

## GET /api/events

Access: session

Authenticated event reads and admin mutations with sync requests.

Implementation: src/web/routes/events.js

Query from/to are parseable dates defining a positive window <=400 days; optional guild includes global and that guild events. Returns expanded custom + system events, including admin-side fields.

## POST /api/events

Access: admin + session + CSRF

Authenticated event reads and admin mutations with sync requests.

Implementation: src/web/routes/events.js

Body event fields documented below; strips any supplied ID and secretPin, saves under web user ID and requests debounce sync. Returns new ID.

## PUT /api/events/:id

Access: admin + session + CSRF

Authenticated event reads and admin mutations with sync requests.

Implementation: src/web/routes/events.js

Path ID overrides body ID. Same save validation; missing event returns 400 in this route. Requests sync and returns ID. No separate per-event creator ownership rule is implemented for admins.

## DELETE /api/events/:id

Access: admin + session + CSRF

Authenticated event reads and admin mutations with sync requests.

Implementation: src/web/routes/events.js

Deletes chosen event as admin, requests sync, returns ok; missing returns 404. Does not delete already sent Discord text.

## GET /api/health

Access: no session required

Unauthenticated basic HTTP liveness response.

Implementation: src/web/routes/health.js

Returns {ok:true} with no login. HTTP liveness only.

## GET /login

Access: no session required

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

Sets tutel_pre if absent (15 minutes), then serves login.html. No account state is returned.

## GET /login.js

Access: no session required

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /app.js

Access: no session required

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /app.css

Access: no session required

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /

Access: session determines redirect; anonymous -> login

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /admin

Access: session + matching role (checked inside page handler)

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /viewer

Access: session + matching role (checked inside page handler)

Login pre-token and role-based page redirects/static entry scripts.

Implementation: src/web/routes/pages.js

## GET /api/preferences

Access: session

Persists per-user theme/filter preferences after normalization.

Implementation: src/web/routes/preferences.js

Reads preferences:<user ID> from settings and parses JSON; malformed/absent data becomes an empty object.

## PUT /api/preferences

Access: session + CSRF

Persists per-user theme/filter preferences after normalization.

Implementation: src/web/routes/preferences.js

Body theme and filters. Theme allowed system/light/dark; filters are known category IDs. Stores normalized JSON and returns ok.

## GET / HEAD /api/calendar (Vercel)

Public snapshot read without login. Supports ETag/304; waiting/storage failure returns 503.

## POST /api/calendar/sync (Vercel)

Bearer CALENDAR_SYNC_SECRET plus JSON schemaVersion/revision/timezone/generatedAt/from/to/events. Two million bytes/10,000 events. Success 200, conflict 409, unauthorized 401, method 405, type 415, size 413, validation 400, storage 503.

## Event mutation body

Field

Meaning / ความหมาย

title / description

Text bounds 160 / 2000; public when exported.

date / endDate / allDay

All-day dates, inclusive form end converted to exclusive midnight.

startsAt / endsAt

Thai local YYYY-MM-DD HH:mm; timed event inputs.

recurrence

none, daily, weekly, monthly, yearly

reminders / reminderMode

Minute offsets, or standard previous-day/day-of schedules.

guildId / holiday / color

Guild scope, holiday flag, #RRGGBB default #4285f4.

# Appendix C Environment reference

## DISCORD_TOKEN

Bot authentication secret; homeserver only.

## CLIENT_ID

Application ID used for command registration.

## GUILD_ID

Optional test-server ID for guild registration.

## YT_DLP_PATH

Executable name/full path, not an entire command.

## FFMPEG_PATH

Optional override; blank selects ffmpeg-static.

## MUSIC_SEARCH_PREFIX

Name-search provider; example scsearch1.

## CONTROL_HOST

Bind interface; choose loopback/LAN deliberately.

## CONTROL_PORT

HTTP listening port; default 3000.

## DATABASE_PATH

Actual SQLite file, relative to working directory if not absolute.

## DATA_DIR

Initial credential-file directory, not an automatic DB relocation.

## ADMIN_INITIAL_PASSWORD

Fresh admin only; blank generates random, existing accounts unchanged.

## CALENDAR_SETUP_PIN

Channel selection/change guard, separate from login and API secret.

## PUBLIC_CALENDAR_URL

Public deep-link origin, not admin URL.

## PUBLIC_SITE_DIR

Private/local snapshot staging folder.

## PUBLIC_DEPLOY_PROVIDER

calendar-api for current data sync; others are legacy adapters.

## CALENDAR_SYNC_URL

HTTPS receiver endpoint ending /api/calendar/sync.

## CALENDAR_SYNC_SECRET

Shared random write credential on both server runtimes, never frontend.

## NETLIFY_AUTH_TOKEN

Optional legacy deployment credential.

## NETLIFY_SITE_ID

Optional legacy site identity.

## VERCEL_TOKEN

Source deployment tooling credential, not data sync authentication.

## VERCEL_PROJECT_ID

Target project for direct deployment tooling.

## VERCEL_PROJECT_NAME

Deployment naming for the legacy/direct adapter.

## VERCEL_TEAM_ID

Scope deployment API calls to the owning team.

## VERCEL_ROOT_DIRECTORY

Optional direct-deploy root prefix; current standalone folder vercel-public.

## BLOB_STORE_ID

Vercel-connected OIDC store ID, public runtime server-side only.

## BLOB_READ_WRITE_TOKEN

Alternative legacy Blob credential; do not expose to visitors.

## NODE_ENV

Production/development runtime convention.

## NODE_OPTIONS

Node flags such as heap limit; not a total-server RAM limit.

# Appendix D Command reference

```text
npm ci
```

Repository root: install locked bot/admin dependencies.

```text
npm start
```

Repository root: start HTTP, schedulers and optional bot.

```text
npm run register
```

Repository root: publish global Discord commands using credentials.

```text
npm run register:guild
```

Repository root: publish only configured test guild commands.

```text
npm run assets:sync
```

Repository root: copy canonical shared assets to provider folders.

```text
npm run format
```

Repository root: write consistent formatting, not runtime tests.

```text
npm run format:check
```

Repository root: report formatting differences without writing.

```text
npm run db:backup
```

Repository root: consistent new private database snapshot.

```text
npm run db:backup -- ./backups/manual.sqlite
```

Explicit new backup destination; must not exist.

```text
npm run calendar:export
```

Generate public snapshot only; no website source deployment.

```text
npm run calendar:publish
```

Export then invoke configured provider, with real side effects.

```text
npm ci --omit=dev
```

vercel-public folder or production root as appropriate.

```text
git diff --cached --name-only
```

List staged filenames, not an upload.

```text
systemctl --user status tutelbot.service
```

Homeserver: inspect active service; not repository template name.

```text
journalctl --user -u tutelbot.service -n 100 --no-pager
```

Homeserver: recent logs; redact secrets before sharing.

```text
systemctl --user restart tutelbot.service
```

Homeserver: restart actual production service; affects playback.

# Appendix E Database schema reference

## users

```text
id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
  must_change INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## sessions

```text
token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  expires_at INTEGER NOT NULL
```

## events

```text
id INTEGER PRIMARY KEY,
  guild_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT NOT NULL,
  all_day INTEGER NOT NULL DEFAULT 0,
  holiday INTEGER NOT NULL DEFAULT 0,
  recurrence TEXT NOT NULL DEFAULT 'none',
  reminders TEXT NOT NULL DEFAULT '[15]',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
```

## guild_config

```text
guild_id TEXT PRIMARY KEY,
  guild_name TEXT NOT NULL DEFAULT '',
  channel_id TEXT,
  default_reminder INTEGER NOT NULL DEFAULT 15,
  timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok'
```

## reminder_log

```text
event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_at TEXT NOT NULL,
  offset_minutes INTEGER NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(event_id, occurrence_at, offset_minutes)
```

## app_settings

```text
key TEXT PRIMARY KEY,
  value TEXT NOT NULL
```

## calendar_deliveries

```text
id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  occurrence_at TEXT NOT NULL,
  schedule_key TEXT NOT NULL,
  message_id TEXT,
  payload TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(guild_id,channel_id,event_key,occurrence_at,schedule_key)
```

## calendar_latest

```text
channel_id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL
```

events also gains reminder_mode default offsets and color default #4285f4 through column checks before ALTER TABLE. Fresh tables pass these additions too. Editing DDL does not automatically migrate existing data.

# Appendix F Worked examples

## All-day / ทั้งวัน

Admin selects 13 October and submits Project meeting, allDay true and blue. POST checks session/admin/CSRF; saveEvent converts midnight to UTC and next-midnight exclusive end. Sync debounces, exports, hashes, uploads, validates and stores Blob. The browser sees it after cache/poll. Default standard schedules are noon on 12 October and 07:00 on 13 October if custom notifications are enabled.

## Weekly / รายสัปดาห์

A weekly lesson at 18:30-19:30 is one stored definition, not 52 inserted rows. Each query expands overlapping instances. ID+at distinguishes weeks and the link selects the chosen occurrence. Editing the base rule changes later query results.

## Concurrent work / งานพร้อมกัน

Radio streaming uses FFmpeg and a guild player while Express saves a calendar event. Async streams/network permit progress; synchronous DB/password work occupies Node briefly. Calendar edits do not replace radio. Bot toggle destroys audio players while web/calendar services remain.

## Failed upload / ส่งไม่สำเร็จ

The local event commit survives a failed POST. Public stays at last successful revision. Pending revision persists; retry reuses it for unchanged content. A later newer edit obtains a newer revision. Inspect last error rather than reverting the event just because the public page is old.

# Appendix G Glossary

## API

A contract of paths, methods, inputs and outputs between programs.

## HTTP method

GET reads; POST creates/acts; PUT replaces/updates; DELETE removes.

## JSON

Text representation of structured objects/arrays; not executable code.

## DTO / projection

Selected data shape crossing a boundary.

## Snapshot

A complete captured view at a point in time.

## Revision

Ordered version used to reject older writes.

## Content hash

Digest identifying meaningful data content.

## ETag

Representation identity used for HTTP validation/conditional writes.

## Idempotency

Retrying the same operation does not create an extra logical effect.

## Debounce

Wait until a burst of changes settles before doing work.

## Backoff

Increasing delay between failed retries.

## Eventual consistency

Replicas converge after propagation rather than immediately.

## Occurrence

One time instance of a potentially repeating event.

## Exclusive end

End boundary itself is outside the event interval.

## UTC / ISO

Standardized instant representation, separate from displayed timezone.

## Guild

A Discord server.

## Interaction

A command/button event sent by Discord to an application.

## Ephemeral

Discord response visible only to the invoking user.

## PCM

Uncompressed sample representation emitted by FFmpeg.

## Opus

Audio codec used in this Discord voice pipeline.

## Pipe

Stream connecting one process output to another input.

## Session

Temporary authenticated state, identified by a browser token.

## Cookie

Origin-bound browser value sent with matching requests.

## CSRF

Unwanted authenticated browser requests; mitigated by session-specific proof.

## Hash / salt

One-way digest; random salt distinguishes identical passwords.

## Foreign key

Database relationship enforced between records.

## WAL

Log containing committed writes before checkpoint into the main file.

## Blob

Stored object/file, not a relational row collection.

## OIDC

Identity mechanism allowing the deployed runtime to authenticate to storage.

## CDN

Edge response cache/distribution layer.

## PWA

Web app using manifest and browser capabilities for install/offline behavior.

## Service worker

Browser background script controlling selected network/cache behavior.

## Facade

Small stable interface exporting focused implementations.

## Composition root

Entry point assembling application services.

# Appendix H References and further reading

Implementation details derive from this repository. These primary references explain concepts and changing platform contracts. Diagrams are vector technical drawings of the system, not AI artwork or unlicensed external imagery.

SQLite WALhttps://www.sqlite.org/wal.html

SQLite VACUUMhttps://www.sqlite.org/lang_vacuum.html

Node SQLitehttps://nodejs.org/api/sqlite.html

Discord interaction response contracthttps://github.com/discord/discord-api-docs/blob/main/developers/interactions/receiving-and-responding.mdx

discord.js APIhttps://discord.js.org/docs/packages/discord.js/main

Discord voice packagehttps://discord.js.org/docs/packages/voice/main

yt-dlp official projecthttps://github.com/yt-dlp/yt-dlp

FFmpeg documentationhttps://ffmpeg.org/documentation.html

Express documentationhttps://expressjs.com/

Helmet projecthttps://helmetjs.github.io/

Vercel private Blobhttps://vercel.com/docs/vercel-blob/private-storage

Vercel Blob OIDChttps://vercel.com/changelog/vercel-blob-now-supports-oidc-authentication

MDN service workershttps://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers

MDN PWA cachinghttps://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching

Tailscale Servehttps://tailscale.com/kb/1242/tailscale-serve

Radio Browser APIhttps://api.radio-browser.info/

date-holidays sourcehttps://github.com/commenthol/date-holidays

Prettier optionshttps://prettier.io/docs/options

Release note: this handbook documents this source edition, not acceptance of every audio source or completeness of every holiday. Consult the accompanying task summary for actual rollout status.

# Appendix I Discord command input contracts

```text
/play query
```

Required title or URL; caller must be in voice. Metadata lookup then enqueue, not a guarantee of sound.

```text
/queue
```

Shows current queued tracks; state is per guild in memory.

```text
/skip
```

Skips current normal track; no current track means nothing to skip.

```text
/stop
```

Clears queue/random/radio and stops sound; stays connected.

```text
/pause /resume
```

Pause or resume existing player.

```text
/nowplaying
```

Shows track/radio status implemented by handler.

```text
/leave
```

Stops streams and destroys guild connection/state.

```text
/randommusic
```

Caller voice required; continuous SoundCloud topic searches.

```text
/radio list area
```

Optional area: bangkok/north/central/east/northeast/west/south/hatyai.

```text
/radio play station area
```

Station required; frequency or name plus optional area. Ambiguous directory results request a precise name.

```text
/calendar setup channel pin
```

GuildText channel and PIN required. Retains existing default offset.

```text
/calendar add title starts
```

Both required; starts YYYY-MM-DD HH:mm Thai. Optional duration 1..10080 (default60), reminder0..10080 (guild default15), repeat and description<=500.

```text
/calendar list
```

Upcoming thirty days, first ten expanded entries.

```text
/calendar delete id
```

Positive integer ID required; deletion restricted to guild-owned custom event.

```text
/calendar config reminder
```

Required0..10080 default offset; requires channel setup first.

```text
/calendar test
```

Sends a real simple readiness message to configured channel; differs from admin embed test.

Event colors and all-day creation are web form capabilities; current Discord add does not define color/all-day options even though storage supports them. Not every web capability has an equivalent slash option.

## Continuous audio update / อัปเดตเสียงต่อเนื่อง

[Complete smooth-transition guide / คู่มือเปลี่ยนเพลงต่อเนื่อง](SMOOTH-TRANSITION.md): optional per-guild setting, one prepared successor in RAM (32 MiB cap), 350 ms overlapping fades and a persistent PCM/Opus resource. Skip uses the same mixer. Repository fallback off; live homeserver/Oracle fallback on. Radio unchanged; known finite tracks up to ten minutes only. Preparation failure, provider limits and connection problems can still cause waiting.

เลือกเปิดแยกเซิร์ฟเวอร์ในตั้งค่าแผงเพลง เตรียมเพลงถัดไปหนึ่งเพลงใน RAM และซ้อนเสียง 350 มิลลิวินาทีผ่านตัวเล่นเดียว รวมกดข้าม repo เริ่มต้นปิด แต่ homeserver และ Oracle เปิดโดยเริ่มต้นเมื่อยังไม่บันทึกค่า ไม่เปลี่ยนวิทยุ และยังมีข้อจำกัดจากแหล่งเพลง/เครือข่าย

## Current source and learning material / โค้ดและสื่อเรียนรู้ปัจจุบัน

The repository conventions are documented in [CODE-STYLE.md](CODE-STYLE.md). The independent Learning Lab is at D:/Tutel-Learning-Lab, contains current snapshots of both repositories, and is not deployed or published with either project. Earlier architecture examples are explicitly identified as historical; current feature explanations take precedence.
