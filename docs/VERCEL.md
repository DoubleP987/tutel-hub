# Vercel deployment / ขึ้นเว็บบน Vercel

## ไทย

ใช้เฉพาะ `vercel-public/` ซึ่งมีเว็บ public เวอร์ชันล่าสุดและ `vercel.json` ไม่ต้องย้ายบอทหรือ admin ไป Vercel

วิธี CLI หลังติดตั้ง/เข้าสู่ระบบ Vercel:

```powershell
cd D:\tutel-bot\vercel-public
npx vercel@latest
npx vercel@latest --prod
```

เลือกหรือสร้าง project ของคุณ ตั้ง Framework เป็น **Other**, ไม่มี Build Command และ Output Directory เป็น `.` ห้ามใช้ root ของบอทเป็น root ของเว็บไซต์ public

ถ้าเชื่อม GitHub ให้เลือก Root Directory `vercel-public` ไฟล์ `calendar.json` จริงถูก ignore เพื่อไม่ commit รายละเอียดกิจกรรม ต้องเติม snapshot ใน deployment ผ่าน CLI หรือระบบซิงก์จาก homeserver ไม่ใช่ Git-only deployment ที่ไม่มี JSON

## ซิงก์จาก homeserver

โค้ดรองรับส่ง snapshot ไป Vercel แล้ว แต่ยังไม่ได้ทดสอบ deploy จริงเพราะยังไม่มี credential ตั้งใน `.env` บน homeserver:

```dotenv
PUBLIC_DEPLOY_PROVIDER=vercel
PUBLIC_SITE_DIR=/home/doublep/tutel-bot/vercel-public
VERCEL_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_PROJECT_NAME=tutel-calendar
VERCEL_TEAM_ID=
PUBLIC_CALENDAR_URL=https://YOUR-ACTUAL-DOMAIN
```

Project ID ใช้จาก project ที่คุณสร้าง Team ID ใส่เฉพาะเมื่อ project อยู่ในทีม Token เก็บเฉพาะ `.env` ของ server ห้ามใส่ใน frontend หรือ GitHub เปลี่ยน URL ในหน้า admin ตั้งค่าแจ้งเตือนด้วย เพื่อให้ปุ่ม Discord เปิดเว็บใหม่

Restart service หลังตั้งค่า ระบบส่งข้อมูลที่เปลี่ยนประมาณทุกนาที และพัก 5 นาทีเมื่อเกิด error จำนวน deployment ยังขึ้นกับโควตาของ Vercel อย่าคิดว่าไม่มีข้อจำกัด

## English

Deploy only `vercel-public/`. Use the Other framework preset, no build/install command and output directory `.`. Use Vercel CLI to deploy the local snapshot. A Git-only deployment will not include ignored calendar JSON; populate it through the outbound publisher or CLI upload.

Set the Vercel environment variables above on homeserver to enable automatic publishing. No credentials have been supplied, so live Vercel deployment remains unverified. Bot/admin and SQLite remain private on homeserver. Update the public calendar URL in the admin settings to the actual deployed domain.

References: https://vercel.com/docs/rest-api/deployments/create-a-new-deployment and https://vercel.com/kb/guide/migrate-to-vercel-from-netlify
