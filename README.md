# Tutel Hub

[Source readability / แนวทางจัดโค้ด](docs/CODE-STYLE.md)

[Developer handbook](docs/DEVELOPMENT.md) · [คู่มือผู้พัฒนา](docs/DEVELOPMENT.th.md) · [Contributing / ขั้นตอนส่งงาน](CONTRIBUTING.md)

## Separate Calendar repository / repo ปฏิทินแยก

Music/radio/private panel remain here. Calendar web, OAuth, groups, invitations and general dates are maintained in [tutel-calendar](https://github.com/DoubleP987/tutel-calendar), with independent .env, database and process. The original Discord reminder adapter remains during migration; no second Calendar bot process has started. [Current status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

## Latest music update / อัปเดตเมนูเพลงล่าสุด

[Current music controls and duration lookup / เมนูสุ่ม วิทยุ Loop และข้อมูลเวลาเพลง](docs/MUSIC-CONTROLS.md)

/join opens the idle player; Random permits changing genres while active; Radio toggles back to music; private menus expire within three minutes. Loop Queue is the per-guild default.

/join เปิดแผงโดยยังไม่เล่น ปุ่มสุ่มเปลี่ยนแนวได้ทันที ปุ่มวิทยุสลับกลับไปเพลง เมนูส่วนตัวหมดอายุสูงสุด 3 นาที และ Loop เริ่มต้นเป็นวนคิวแยกเซิร์ฟเวอร์

**Discord music, live radio, Thai calendar reminders, and a private control panel.**  
Created by **Double_P** · Suggested GitHub repository: `tutel-hub`

[ภาษาไทย](README.th.md) · [SQLite guide / คู่มือฐานข้อมูล](docs/SQLITE.md)

[Current operation and handbook updates / คู่มือการทำงานปัจจุบัน](docs/CURRENT-OPERATIONS.md) · Updated 4 October 2026

[Playlist, queue controls and 25 optional random genres](docs/PLAYLIST-AND-QUEUE.md)

[Radio status checks, guild calendar commands, login theme and live panel logs](docs/RADIO-AND-PANEL.md)
Latest behavior: [daily summaries and per-guild music sources](docs/DAILY-SUMMARY-AND-MUSIC.md). This update supersedes reminder schedules in the older PDF handbooks.

[Smooth transitions, RAM preparation and resource limits](docs/SMOOTH-TRANSITION.md)

## Bot language and /help

Thai is the default. Set `language: 'en'` in `src/config/bot.js`, or `BOT_LANGUAGE=en` in `.env` (the environment overrides code). Restart after changing it, then run `npm run register` to update command descriptions.

`/help` privately displays website/guide buttons opening https://tutelbot.vercel.app. No voice channel is needed. The Loop button cycles Off / Track / Queue; Skip advances and Stop resets Loop.

- [Bot language guide](docs/BOT-LANGUAGE.md)
- [MongoDB and failover](docs/MONGODB-FAILOVER.md)
- [Chat music player](docs/MUSIC-PANEL.md)

Use `npm run profile:update` to explicitly update the application description/link. Admin/public website language is independent; song/station names and user event text are preserved.

## Promotional website

[**View website →**](https://tutelbot.vercel.app/) · [Website guide](promo-site/README.md)

**Version: 1.0.0**. The bilingual promotional site lives in `promo-site/`. Light is the default; a theme switch remembers light/dark preference. GitHub Pages publishes only this static folder, independently of the bot, admin panel and public calendar.

## Features

- Stream music using yt-dlp → FFmpeg → Discord voice without saving song files. YouTube is the default; change each guild to SoundCloud with `/music settings` or the admin panel. Availability depends on the source.
- Live radio lookup by station/frequency and area. An online stream must exist; a frequency alone cannot receive FM radio.
- Queue, playback controls, and continuous random music.
- Thai holidays, important days, Buddhist holy days, recurring/custom events, and Discord channel reminders.
- Full-width month/week/day/agenda calendar, event colors (blue by default), stacked events, timed overlaps, search, filters, dark/light/device theme, and mobile layouts.
- Private authenticated admin panel; separate read-only public calendar on Vercel. Home-screen web app support.
- SQLite for a standalone installation, or shared MongoDB Atlas storage with two-node failover. Outbound API snapshot synchronization; no Google Calendar API is required.

## Requirements

- Node.js **24 or newer** with npm. This project uses built-in `node:sqlite`.
- Python 3 and yt-dlp, or an official yt-dlp executable accessible by the server.
- FFmpeg: on Linux install Ubuntu's build with `sudo apt-get install ffmpeg`. The app prefers `/usr/bin/ffmpeg`, then `~/.local/bin/tutel-ffmpeg`, then the npm bundle. `FFMPEG_PATH` overrides this selection. Some bundled Linux builds crash on HTTPS radio input; a working pipe decoder does not prove remote radio input works.
- Discord application/bot credentials for Discord features. Netlify credentials are optional.

## Windows setup

Run in PowerShell:

```powershell
cd D:	utel-bot
node --version
npm --version
npm ci
python -m pip install --upgrade yt-dlp
Get-Command yt-dlp
```

`npm ci` installs exactly the versions in the lockfile. `Get-Command` shows the executable location. If yt-dlp is absent from PATH, put its full executable path in `.env`.

For a fresh GitHub clone, create `.env` first:

```powershell
Copy-Item .env.example .env
```

**This local folder already contains a placeholder `.env`; do not overwrite a configured file.** Set:

```dotenv
DISCORD_TOKEN=your-bot-token
CLIENT_ID=your-application-id
GUILD_ID=
YT_DLP_PATH=yt-dlp
FFMPEG_PATH=
CONTROL_HOST=127.0.0.1
CONTROL_PORT=3000
DATABASE_PATH=./data/tutel.sqlite
DATA_DIR=./data
CALENDAR_SETUP_PIN=your-private-setup-pin
PUBLIC_SITE_DIR=./vercel-public
```

- `CLIENT_ID`: Discord application ID. `GUILD_ID`: optional test server ID, used only for guild registration.
- Paths are relative to the project folder. For Windows paths use forward slashes, or double quotes if a path contains spaces.
- Keep `NETLIFY_AUTH_TOKEN` / `NETLIFY_SITE_ID` blank until intentionally enabling public deployment.
- Fresh databases generate an initial admin password in `data/admin-initial-password.txt`. You can instead provide a private `ADMIN_INITIAL_PASSWORD` of at least 10 characters. First login requires a password change.

```powershell
npm start
```

Open **http://127.0.0.1:3000/login**. `npm start` starts the panel, calendar scheduler, optional publisher, and Discord bot when a token exists. Without a token the panel still works; Discord actions do not.

### Existing homeserver copy

This local copy contains the existing SQLite database in `data/tutel.sqlite` and production credentials in **`private/homeserver.env`**. Both are ignored by Git. Existing accounts/passwords remain unchanged; the fresh-database bootstrap settings do not reset them.

The production environment contains Linux paths: keep it as a private reference, and edit the local `.env` separately. The original service still runs on homeserver. **Stop it before starting a second instance with the same Discord token** to avoid competing interaction handlers/reminders. Copying files does not install local dependencies or start the bot.

## Discord setup

Invite the application using Discord OAuth2 with `bot` + `applications.commands`. Grant View Channels, Send Messages, Connect, and Speak in the intended channels.

```powershell
npm run register
# Optional: register only in the test server specified by GUILD_ID
npm run register:guild
```

Registration writes slash commands to Discord; it does not start or invite the bot. Global commands work across installed servers. Avoid registering the same commands globally and in a guild if duplicate entries are confusing.

| Command                                               | Purpose                                              |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `/play`, `/queue`, `/skip`, `/stop`                   | Search/play, inspect queue, skip, clear playback     |
| `/pause`, `/resume`, `/nowplaying`, `/leave`          | Playback controls and leave voice                    |
| `/music settings`                                     | View/change the guild music source (YouTube default) |
| `/randommusic`                                        | Continue random tracks from the guild source         |
| `/radio list`, `/radio play`                          | List/live radio by station and area                  |
| `/calendar setup`                                     | Choose reminder channel; requires setup PIN          |
| `/calendar add`, `/calendar list`, `/calendar delete` | Manage events                                        |
| `/calendar config`, `/calendar test`                  | Reminder offset and real channel test message        |

PIN is for channel setup/change, not event creation. In the admin panel select reminder categories, the daily summary time, message template, and Discord embed color.

## SQLite: no database server to install

SQLite stores accounts, sessions, events, reminder configuration and delivery history inside **one local file**. The app creates tables and adds schema columns automatically. No MySQL user, port, database service, or SQL import is needed.

- Existing `data/tutel.sqlite`: use existing data/accounts.
- Fresh clone without the file: first startup creates a new database/accounts.
- Do not commit the file or host it on Netlify. Treat backups as private.
- Do not copy only the main file while a running database has WAL changes. Use the backup helper:

```powershell
npm run db:backup
```

A consistent snapshot is written to `backups/`. See [the SQLite guide](docs/SQLITE.md) for restore instructions.

## Public calendar / Netlify

`netlify-public/` contains only the read-only calendar frontend. Do not upload the repository, admin frontend, `.env`, `private/`, or database to Netlify.

```powershell
npm run calendar:export
```

This generates `netlify-public/calendar.json` from the configured database. The generated snapshot is ignored by Git because it includes calendar titles/descriptions. All calendar events are exported; there is currently no per-event private/public visibility setting. Review the intended public data before publishing.

For automatic sync, set your own `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, and `PUBLIC_CALENDAR_URL`. Start the app, or deploy once with:

```powershell
npm run calendar:publish
```

While running, the app checks approximately every minute and deploys changed public files only. The public site is a static snapshot, not a public connection to the private database/API. Website preferences are stored per device; admin preferences also persist in the database. Public snapshot spans the previous year through two years ahead. Holy-day data currently covers 2025–2035; newly announced special holidays require updates.

## Linux deployment

Copy/clone the repository to `~/tutel-bot`, create `.env`, install Node.js 24+, yt-dlp and FFmpeg, then `npm ci`. Adjust executable paths for that machine. For LAN access set `CONTROL_HOST=0.0.0.0`; expose admin only on a trusted LAN/Tailscale. Tailscale Serve can provide HTTPS for the admin web app.

An example user service is in `deploy/tutel-hub.service`. Adjust its Node path if needed:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/tutel-hub.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now tutel-hub.service
journalctl --user -u tutel-hub.service -f
```

For continuous operation after logout, configure user lingering on the host. The service controls the whole process; the panel's bot switch only disconnects/reconnects Discord while the web panel remains running.

Docker is optional: `docker compose up -d --build`. The included configuration persists `data/` and `netlify-public/`, binds port 3000 to host localhost, and limits memory. Bind-mounted directories must be writable by container UID 1000. Adjust host access for your deployment.

## Repository layout

```text
src/bot/             Discord connection/runtime
src/music/           Track lookup, streams, queues and radio
src/commands/        Slash command definitions/handlers
src/integrations/calendar/legacy/        SQLite, Thai dates, reminders and public publishing
src/web/             Private web server and admin assets
netlify-public/      Separate public calendar assets (generated JSON ignored)
scripts/             Database backup helper
deploy/              Example systemd user service
docs/                SQLite/setup explanations
.env.example         Credential-free configuration template
private/             Local production environment copy — ignored
data/                Runtime SQLite data — ignored
backups/             Private database snapshots — ignored
```

## Prepare for GitHub

The repository is published at https://github.com/DoubleP987/tutel-hub. Review local changes before committing:

```powershell
git status --short
git add .
git diff --cached --stat
git commit -m "Describe the change"
# Configure origin only when setting up a new clone without a remote.
# git remote add origin https://github.com/DoubleP987/tutel-hub.git
git push -u origin main
```

`.gitignore` excludes credentials, live database/session data, public calendar JSON, backups and dependencies. It does not remove a secret that was previously committed. No project license has been chosen yet; select one before distributing if desired. Dependencies retain their own licenses. The turtle icon is the existing user-provided Discord avatar; verify redistribution rights for your repository.

On touch devices, swipe left/right over the month/day calendar to move forward/back. In a narrow week timeline, horizontal swipes scroll the seven-day grid. No install button is shown. Eligible Android browsers show an install dialog with Install/Later; dismissing postpones it for seven days. HTTPS and browser installability are required.

Home-screen app name: **Tutel📅**. Mobile icon uses the original turtle on a dark background; installed apps show a brief animated launch screen. The Discord avatar is unchanged.

Mobile UI: custom themed view menu, selected-day list below the calendar, scroll-aware top header, a floating add-event button in admin, and clipped event labels without ellipses. Discord notification formatting is unchanged.

Desktop: selected-day cards are shown below the calendar. Scroll the mouse wheel over the month grid to move between months; outside the grid, normal page scrolling remains available.

## Vercel

The current alternative public hosting bundle is `vercel-public/`. See [Vercel setup](docs/VERCEL.md). Use this folder for Vercel and the previous `netlify-public/` only for Netlify.

## Public calendar API / API ปฏิทิน public

See [Calendar API setup](docs/CALENDAR-API.md). The new public app is `vercel-public`; event changes send data to its API and private Blob instead of creating new deployments. Configure the store and shared secret before activating the homeserver sender.

## Maintainer documentation

See [architecture](docs/ARCHITECTURE.md), the [English handbook](docs/manuals/Tutel-Hub-Handbook-EN.pdf), and the [Thai handbook](docs/manuals/Tutel-Hub-Handbook-TH.pdf). The current public provider is `calendar-api`; legacy Netlify instructions below are retained for that adapter only.

Shared browser assets are edited under `src/web/public/`; run `npm run assets:sync` after changing them. Use `npm run format` for consistent source style. Vercel Root Directory is `vercel-public`.

## Smooth playback

Enable or disable Smooth transition in the private settings message on the Discord music panel (Manage Server required). Off by default; saved per guild. Enabled playback prepares one compressed successor in RAM (32 MiB cap) and overlaps songs for 350 ms through one persistent audio resource, including Skip. Slow sources can still delay preparation; see the linked guide for memory limits, fallback and diagnostics.

## Product boundaries / ขอบเขตแต่ละส่วน

Tutel’s public promotional website describes the Discord music and live-radio bot. The calendar is a personal application sharing the current repository, database adapter and bot notification runtime; it is not offered as a public bot feature on the promotional site. Its private admin and separate read-only Vercel frontend remain operational. No calendar data or functionality was removed by this presentation change.

เว็บโปรโมทนำเสนอเฉพาะบอทเพลงและวิทยุ ปฏิทินเป็นแอปใช้งานส่วนตัวที่ใช้โครงสร้าง ฐานข้อมูล และระบบส่งข้อความของบอทร่วมกันอยู่ใน repo ตอนนี้ หน้า admin และเว็บปฏิทิน Vercel แยกยังทำงานตามเดิม การแยกการนำเสนอไม่ได้ลบข้อมูลหรือความสามารถปฏิทิน

## Discord identities and retained music history

- [English guide](docs/BOT-IDENTITIES.md)
- [คู่มือภาษาไทย](docs/BOT-IDENTITIES.th.md)

## Calendar Feedback inbox

The main panel has an admin-only inbox for Calendar Feedback and private image attachments. See [Feedback integration](docs/FEEDBACK.md).
