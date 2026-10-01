# Public calendar API sync / ส่งข้อมูลปฏิทินผ่าน API

## How it works
The homeserver SQLite database remains authoritative. Event changes trigger a sync after five seconds; a minute timer also catches Discord changes, reconnects and holiday updates. Only a changed public snapshot is sent. Vercel stores one private Blob and serves a read-only JSON endpoint. Updating events never creates a deployment.

- `POST /api/calendar/sync`: authenticated snapshot write. Requires a dedicated shared secret, not the Vercel deployment token.
- `GET /api/calendar`: read-only public snapshot. CDN cache lasts 60 seconds; stale revalidation may add another minute.
- SQLite records pending and successful revisions. Retries are idempotent; older revisions are rejected and Blob ETags prevent concurrent writes from overwriting newer data.
- Browser checks every minute and when returning to the tab. The service worker retains the last successfully read snapshot for offline use.
- Credentials, Discord configuration, accounts, session records and database files are never included in the public snapshot.
- All exported events are public, including custom events. Do not enter confidential details intended to remain private.

## 1. Vercel data store
Open the Vercel project → Storage → Create Store / Create Database → Blob. Name it `tutel-calendar-data`, choose **Private**, select Singapore (`sin1`) if available. Connect it to this project for Production and Preview. Vercel creates `BLOB_READ_WRITE_TOKEN` automatically.

## 2. Shared secret
A private generated secret is stored locally in `private/calendar-api-setup.env` and the root `.env`. These are ignored by Git.
Copy ONLY the secret to the clipboard with PowerShell (the command does not print it):

```powershell
(Get-Content D:\tutel-bot\private\calendar-api-setup.env | Where-Object { $_.StartsWith('CALENDAR_SYNC_SECRET=') }) -replace '^CALENDAR_SYNC_SECRET=', '' | Set-Clipboard
```

In Vercel → Settings → Environment Variables, add `CALENDAR_SYNC_SECRET`, paste the copied value, and select Production and Preview. Never put it in frontend JS or prefix it with `NEXT_PUBLIC_`.
The homeserver must use exactly the same secret. The deployment token is not used by the new data sender.

## 3. Deploy the public app
Import the GitHub repository. Set Root Directory to `tutel-vercel-public`, Framework to Other, Install Command to `npm ci --omit=dev`, Build Command empty and Output Directory to `.`. `vercel.json` already supplies these settings. Deploy after configuring the store and environment variables.
The public app includes a separate package.json/package-lock.json for @vercel/blob. Do not deploy the bot or admin as the public project root.
The calendar may show a waiting message until the first homeserver sync.

## 4. Enable the homeserver sender AFTER the new API is deployed
The files in this working copy are ready; the running homeserver has not been migrated in this phase.
Install/copy the changed sender and admin code to the homeserver, then configure its existing `.env`:

```dotenv
PUBLIC_DEPLOY_PROVIDER=calendar-api
PUBLIC_SITE_DIR=/home/doublep/tutel-bot/vercel-public
CALENDAR_SYNC_URL=https://cskru.vercel.app/api/calendar/sync
CALENDAR_SYNC_SECRET=the_same_secret_as_vercel
PUBLIC_CALENDAR_URL=https://cskru.vercel.app
```

`PUBLIC_SITE_DIR` is a staging directory for the snapshot only; it no longer deploys the website.
Restart the user service after installing the source and configuring `.env`:

```sh
systemctl --user restart tutelbot.service
```

In admin settings, use **ซิงก์ปฏิทินตอนนี้** or wait for the first scheduled sync. The calendar becomes available after a successful write. GitHub deployments do not delete the stored calendar data.
If API configuration is missing or a request fails, the source SQLite data is preserved; the error appears in admin. Before switching, the currently deployed website and homeserver keep their existing behavior.

## 5. GitHub commands
Run in PowerShell or Command Prompt:

```sh
cd D:\tutel-bot
git add .
git diff --cached --name-only
git commit -m "feat(calendar): sync public events through API and Blob storage"
git push origin main
```

Ensure no `.env`, `private/`, database, passwords or tokens appear in the staged list. `.env.example` files are safe placeholders. The old bundled `tutel-vercel-public/calendar.json` is removed; public data is now stored in Blob.

## ภาษาไทย

### หลักการ
เพิ่ม/แก้/ลบกิจกรรมที่ admin แล้ว homeserver ส่งข้อมูลผ่าน HTTPS ไปยัง API ของ Vercel ไม่ได้สร้าง deployment ใหม่ทุกครั้ง บ้านเป็นฝ่ายส่งออก จึงไม่ต้องเปิดพอร์ตและไม่มีปัญหาเมื่อไอพีบ้านเปลี่ยน

ข้อมูลหลักยังเป็น SQLite บน homeserver ส่วน Blob เป็นสำเนาสำหรับเว็บ public ถ้าบ้านออฟไลน์ เว็บยังอ่านข้อมูลล่าสุดบน Blob ได้ คนดูเว็บไม่มีสิทธิ์เขียนข้อมูล

### ลำดับตั้งค่า
1. สร้าง Blob แบบ **Private** และเชื่อมกับโปรเจกต์ Production/Preview
2. คัดลอก secret จากไฟล์ `private/calendar-api-setup.env` ด้วยคำสั่งด้านบน แล้วเพิ่ม `CALENDAR_SYNC_SECRET` ใน Vercel
3. Push GitHub และ deploy โฟลเดอร์ `tutel-vercel-public` บน Vercel
4. หลัง API deploy แล้ว ค่อยอัปเดตโค้ดฝั่ง homeserver และตั้ง `.env` ตามตัวอย่าง โดยใช้ secret เดียวกัน
5. รีสตาร์ต service แล้วกด **ซิงก์ปฏิทินตอนนี้** ใน admin

การเปลี่ยนแปลงอาจใช้ประมาณ 1–3 นาทีจึงแสดงบนเว็บ ขึ้นกับรอบตรวจและแคช หากส่งไม่สำเร็จจะลองใหม่อัตโนมัติ หน้า public ยังแสดงข้อมูลก่อนหน้าที่ส่งสำเร็จ

ยังไม่ได้ deploy หรือทดสอบ API จริงในขั้นตอนนี้ เพราะผู้ใช้เลือกอัปผ่าน GitHub/Vercel เอง ระบบที่รันอยู่บน homeserver ยังไม่เปลี่ยนไปใช้ API นี้
