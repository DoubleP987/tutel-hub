# MongoDB and two-node failover / MongoDB และระบบเครื่องสำรอง

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

## Architecture / โครงสร้าง

Both nodes connect outbound over TLS to the same MongoDB Atlas database. There is no MongoDB server process on the Oracle micro VM. The normal driver pool is capped at five connections per process. Each node exposes its local control panel; homeserver can relay authorized bot requests to the active Oracle node using encrypted MongoDB jobs. Oracle does not need a reachable public inbound address for this relay or public calendar synchronization.

สองเครื่องเชื่อม MongoDB Atlas ฐานเดียวกันด้วย TLS แบบออกจากเครื่อง ไม่ต้องติดตั้ง MongoDB บน Oracle หน้า control panel บน homeserver ส่งคำสั่งให้อีกเครื่องผ่านงานที่เข้ารหัสใน MongoDB ได้ Oracle ไม่ต้องเปิด public port เพื่อรับคำสั่งหรือส่งข้อมูลขึ้นปฏิทิน

Shared data: users/password hashes, login sessions, events, guild reminder settings, app settings, reminder delivery records and latest notification/panel references. Numeric user/event IDs from SQLite are preserved.

ข้อมูลร่วมกัน: บัญชีและ hash รหัสผ่าน session กิจกรรม ค่าแต่ละเซิร์ฟเวอร์ ประวัติแจ้งเตือน และข้อมูลข้อความล่าสุด ID เดิมยังใช้ได้

## Configuration / ตั้งค่า

```dotenv
DATABASE_PROVIDER=mongodb
MONGODB_URI=your-private-atlas-connection-string
MONGODB_DATABASE=tutel
CLUSTER_NODE_ID=homeserver
CLUSTER_PRIMARY_NODE=homeserver
CLUSTER_CONTROL_SECRET=<same-long-random-secret-on-both-nodes>
BOT_LANGUAGE=th
```

Use `CLUSTER_NODE_ID=oracle` on Oracle, with `MUSIC_SOURCE_OVERRIDE=soundcloud` and optionally `MAX_ACTIVE_VOICE_GUILDS=1`. A blank node ID runs a standalone bot. Do not run two standalone copies of the same bot token. Credentials remain in each host's private `.env`, never in GitHub, the promotional website, or public API responses.

Atlas database users need read/write access to the application database. Configure the Atlas network access list for your hosts. This installation explicitly authorized `0.0.0.0/0` for changing home IP addresses, with TLS and a strong unique password; it is not a requirement for every installation. Prefer narrower network access if stable addresses become available.

Oracle ตั้ง node เป็น `oracle` และ override แหล่งเพลงเป็น SoundCloud ได้ จำกัดห้องเสียงพร้อมกันไว้หนึ่งห้องเพื่อประหยัดทรัพยากร ห้ามรันสองสำเนาแบบ standalone ด้วย token เดียวกัน เก็บ credential เฉพาะ `.env` ส่วนตัวของเครื่อง การอนุญาตทุก IP ใช้รองรับ IP บ้านเปลี่ยนตามที่เจ้าของอนุมัติ ไม่ใช่ข้อบังคับของ MongoDB

## Switching / การสลับ

The control panel selects Auto, homeserver or Oracle; turning the bot off disables automatic takeover until enabled again. `/bot status`, `/bot shutdown` and `/bot switch` are restricted to the owner/authorized operator with Manage Server permission.

A MongoDB lease chooses one Discord owner. Heartbeats renew every two seconds; the lease expires after 12 seconds. A separate watchdog kills a stuck owner before its local six-second safety deadline. Real-server testing measured Oracle takeover in 13.3 seconds. In Auto mode, homeserver becomes primary again when healthy.

แผงควบคุมเลือก Auto/homeserver/Oracle ได้ ปิดบอททั้งระบบแล้วจะไม่เปิดตัวสำรองเองจนกว่าจะเปิดอีกครั้ง ทดสอบรับงานต่อได้ใน 13.3 วินาที จึงไม่ใช่การสลับในศูนย์วินาที

Queues, playback positions, Loop and random selection state are in memory: music needs to be started again after a handover. Stored data is shared; live audio is not replicated. If homeserver loses power, its web panel is also unavailable, although Oracle can continue bot/reminder/API duties. Use an SSH tunnel or authenticated private network for Oracle's locally bound panel when needed.

คิว ตำแหน่งเพลง Loop และสถานะเล่นเสียงไม่ได้จำลองร่วมกัน สลับเครื่องแล้วต้องเปิดเพลงใหม่ หาก homeserver ดับ หน้าเว็บที่โฮสต์บนเครื่องนั้นจะเข้าไม่ได้ แต่ Oracle ยังรับงานบอท แจ้งเตือน และ sync ได้

## Migration and backup / ย้ายและสำรอง

Stop the application and take a consistent SQLite snapshot first. Set the MongoDB variables, then run:

```sh
node scripts/migrate-to-mongodb.js /private/consistent-backup.sqlite
npm run db:backup
```

Migration verifies record fingerprints and refuses to overwrite different existing target records. Keep the source backup privately. The MongoDB backup command exports the eight application collections, excluding transient leases/relay jobs. A logical JSON backup made during writes is not a point-in-time transaction; pause writes or use a suitable Atlas/mongodump backup procedure when a consistent restore point is required. Treat session/password-hash backups as private.

ย้ายข้อมูลโดยหยุดโปรแกรมและใช้ SQLite backup ที่สมบูรณ์ก่อน สคริปต์ตรวจข้อมูลและไม่เขียนทับ target ที่ไม่ตรง เก็บ backup ส่วนตัว การ export MongoDB ระหว่างมีการเขียนข้อมูลไม่ใช่ snapshot ธุรกรรมเดียว หากต้องการ restore point ที่ตรงกันให้หยุดการเขียนหรือใช้วิธี backup ที่เหมาะสม

## Public calendar / ปฏิทิน public

Events remain in MongoDB. The active node publishes a read-only snapshot through the authenticated calendar sync API to private Vercel Blob storage; adding events does not redeploy the site. Conditional writes use storage metadata ETags, allow overwrite explicitly, and retry conflicts. Invalid credentials return 401; stale revisions return 409. The production API was verified to save/read 546 entries after the 503 repair.

ปฏิทินส่ง snapshot ผ่าน API ไม่ deploy ใหม่ทุกครั้งที่เพิ่มกิจกรรม ตัวรับตรวจ secret และ revision เว็บ public ไม่ได้รับ credential ของ MongoDB หรือ Discord

## Limits / ข้อจำกัด

An Atlas outage prevents safe lease renewal, so the bot fails closed and the service retries. Delivery records reduce duplicates, but a crash after Discord accepts a message and before its record is saved can still cause a duplicate; Discord and MongoDB do not share one transaction. Failover is not a guarantee of uninterrupted audio or exactly-once external message delivery.

## Current operation update / อัปเดตการทำงาน

[Current operation, 4 October 2026 / การทำงานปัจจุบัน](CURRENT-OPERATIONS.md) documents the single random-genre selector, private music/radio replies, per-guild playback status, host cards, sidebar logout and working log route.
