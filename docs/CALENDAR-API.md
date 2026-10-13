# Public calendar API / การส่งข้อมูลปฏิทิน

> Deployment update, 13 October 2026: live Calendar and `/admin` Panel now run on ora. Music primary is homeserver, standby is ora; oracle applications are retired. [Current deployment and recovery](ORA-DEPLOYMENT.md). Earlier dated deployment descriptions below are historical.

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

## Current architecture

The configured database is authoritative: shared MongoDB Atlas in the two-node deployment, or SQLite in standalone mode. The active node publishes outbound snapshots. Vercel stores a sanitized public snapshot
in private Blob and serves it through `GET /api/calendar`. Event edits trigger
a five-second debounce; a minute timer catches other edits and retries. Only
changed data normally uploads. Updating events never creates a deployment.

Source root: `vercel-public/`. Framework Other, install `npm ci --omit=dev`,
empty build command, output `.`. Connect private Blob and configure
`BLOB_STORE_ID` for OIDC (or supported legacy Blob token), plus
`CALENDAR_SYNC_SECRET` on the server runtime. Credentials stay out of frontend.

Homeserver settings:

```dotenv
PUBLIC_DEPLOY_PROVIDER=calendar-api
PUBLIC_SITE_DIR=/home/doublep/tutel-bot/vercel-public
PUBLIC_CALENDAR_URL=https://cskru.vercel.app
CALENDAR_SYNC_URL=https://cskru.vercel.app/api/calendar/sync
CALENDAR_SYNC_SECRET=
```

Fill the last value privately with the same independent random secret as
Vercel. It is not Discord token, admin password, setup PIN or deployment token.
Preserve an existing production secret.

## Contracts and limits

- POST sync: Bearer secret, JSON schemaVersion 1, monotonic revision,
  timezone/from/to/generatedAt/events; maximum two million serialized bytes
  and 10,000 entries.
- GET/HEAD read: public, ETag/304, CDN cache 60 seconds with stale revalidation.
  Client polls every minute.
- Older writes return 409; equal revision/content is idempotent; conditional
  Blob writes prevent competing stale overwrites.
- Failure retries up to five-minute backoff; public retains last successful data.
- All exported custom events and descriptions are public; no visibility flag.
- Changing home IP does not affect outbound authentication. Admin access
  still uses LAN/Tailscale independently.

## ภาษาไทย

บ้านเป็นต้นฉบับและส่ง HTTPS ออกไป Vercel จึงไม่ต้องเปิด port ขาเข้าเพื่อ sync
และ IP บ้านเปลี่ยนไม่เป็นปัญหา เว็บ public อ่านสำเนาผ่าน API ไม่อ่าน SQLite
โดยตรง ไม่ต้อง login admin

secret ยืนยันสิทธิ์เขียน ไม่ใช่รหัสบัญชีหรือ PIN ตั้ง channel ต้องตรงกันสองฝั่ง
และเก็บ server environment เท่านั้น เปลี่ยนข้างเดียวจะได้ 401

แก้กิจกรรมไม่ deploy เว็บ แต่ยังใช้ function/Blob/bandwidth อาจรอ debounce,
cache และ poll ให้ดู lastSync/error และ revision ไม่ deploy source ซ้ำเพื่อ
แก้ปัญหาข้อมูลทุกครั้ง

## Detailed reference

[Architecture](ARCHITECTURE.md) · [English PDF](manuals/Tutel-Hub-Handbook-EN.pdf)
· [PDF ภาษาไทย](manuals/Tutel-Hub-Handbook-TH.pdf)

## 12 October group administration release

New protected APIs cover owner assistant/announcement permissions, durable announcement delivery, current-device Push status, privileged user/session/member management, suspended-group permanent deletion, `/internal/v1/bot/runtime-info` and URL-based `/internal/v1/bot/connect-link`. See the Calendar repository docs ANNOUNCEMENTS-AND-ADMIN.md, DISCORD-CALENDAR-BOT.md and ROLLBACK.md for exact authorization and recovery rules. Main Panel exposes these through its authenticated admin proxy; service keys never reach the browser.

## Invitation lifetime — 12 October 2026

New invitations default to no expiration (`days: 0` in the API, `expires_at: 0` in storage). The UI offers no expiry, 1, 7, 14 or 30 days; the API also accepts integer durations 1–30. This applies to link, email, code and newly created CSV invitations. Links and email invitations remain single-use. Codes retain their configured use limit. Revocation, membership restrictions and suspended/trashed-group checks still apply.

A one-time migration upgrades unused, unrevoked existing seven-day invitations to no expiration, including those whose seven days already elapsed. It preserves the invitation ID, token hash, role and email delivery state: previously sent links continue to work and no email is resent. Consumed/revoked invitations are not revived. Explicit finite invitations created after migration keep their chosen duration. Sessions, OAuth states and ownership transfer deadlines are unchanged.

Previously delivered emails may still say seven days: the server-side invitation now has no deadline; email contents cannot be edited retrospectively. Cancel an invitation from the group's invitation list whenever needed. Migration recovery requires the pre-change private SQLite snapshot (restore specific expiry values, not the whole live database).

คำเชิญใหม่ตั้งต้นไม่มีวันหมดอายุ เลือกจำนวนวันได้ในตัวเลือกเพิ่มเติม คำเชิญเดิม 7 วันที่ยังไม่ได้ใช้ครบและไม่ถูกยกเลิก ใช้ลิงก์เดิมได้โดยไม่ส่งเมลใหม่ ทั้งนี้ลิงก์/อีเมลยังใช้ได้ครั้งเดียว ข้อความวันที่ในอีเมลเก่าอาจยังเป็น 7 วัน แต่ระบบตรวจอายุจากฐานข้อมูลที่ปรับแล้ว
