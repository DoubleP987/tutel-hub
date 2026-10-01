# Public calendar API / การส่งข้อมูลปฏิทิน

## Current architecture

Homeserver SQLite is authoritative. Vercel stores a sanitized public snapshot
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
