# Tutel Hub

**บอทเพลง วิทยุสด ปฏิทินไทยและการแจ้งเตือน Discord พร้อมหน้า control panel**  
โดย **Double_P** · ชื่อ GitHub repo ที่แนะนำ: `tutel-hub`

[English](README.md) · [คู่มือ SQLite](docs/SQLITE.md)

รายละเอียดล่าสุด: [สรุปรายวันและแหล่งเพลงแยกเซิร์ฟเวอร์](docs/DAILY-SUMMARY-AND-MUSIC.md) แทนเวลาเตือนแบบเก่าในคู่มือ PDF

## เว็บไซต์โปรโมท

[**เปิดดูเว็บไซต์ →**](https://doublep987.github.io/tutel-hub/) · [คู่มือเว็บไซต์](promo-site/README.md)

**เวอร์ชัน: 1.0.0** หน้าโปรโมทสองภาษาอยู่ใน `promo-site/` ใช้ธีมขาวเริ่มต้นและจำธีมขาว/มืดที่เลือก GitHub Pages เผยแพร่เฉพาะเว็บนี้ แยกจากบอท หน้า admin และปฏิทิน public

## ทำอะไรได้บ้าง

- เล่นเพลงแบบสตรีมผ่าน yt-dlp → FFmpeg → Discord ไม่บันทึกไฟล์เพลง ค้นจาก YouTube เป็นค่าเริ่มต้น เปลี่ยนแยกเซิร์ฟเวอร์เป็น SoundCloud ได้ เพลงบางรายการอาจเล่นไม่ได้หรือมีเพียงพรีวิวตามข้อจำกัดของแหล่งเพลง
- วิทยุสดเลือกชื่อสถานี/ความถี่และพื้นที่ ต้องมีสตรีมออนไลน์ ความถี่อย่างเดียวไม่ใช่การรับ FM จากเสาอากาศ
- คิวเพลง พัก/เล่นต่อ ข้ามเพลง และสุ่มเพลงต่อเนื่อง
- วันหยุดและวันสำคัญไทย วันพระ กิจกรรมที่เพิ่มเอง กิจกรรมทำซ้ำ และแจ้งเตือน Discord
- ปฏิทินเดือน/สัปดาห์/วัน/รายการ เต็มพื้นที่ เลือกสีกิจกรรม (เริ่มต้นฟ้า) ซ้อนรายการ ค้นหา กรองหมวด และธีมตามอุปกรณ์/สว่าง/มืด รองรับมือถือ
- หน้า admin ต้อง login และแยกจากปฏิทิน public แบบดูอย่างเดียวบน Netlify เพิ่มเป็นเว็บแอปที่หน้าจอหลักได้
- ฐานข้อมูล SQLite และส่ง snapshot ไป Netlify ได้ ไม่ต้องใช้ Google Calendar API

## ไฟล์ที่คัดลอกมาจาก homeserver

อยู่ที่ `D:\tutel-bot` โดยนำ source ล่าสุด เว็บไซต์ public และข้อมูลเดิมมาให้แล้ว:

- `data/tutel.sqlite` ฐานข้อมูลเดิม ใช้บัญชีและรหัสผ่านเดิม
- `private/homeserver.env` สำเนา credential และการตั้งค่า production มี path Linux ต้องเก็บเป็นความลับ
- `.env` สำหรับเครื่องนี้ เป็น placeholder ยังไม่มี token จริงและยังไม่เปิด auto-publish
- `node_modules` ไม่คัดลอก เพราะต้องติดตั้งใหม่ให้ตรงระบบ Windows ด้วย `npm ci`

**ยังไม่ได้เปิดบอทในเครื่องนี้ และ homeserver ยังรันอยู่** หากจะใช้ token เดียวกันในเครื่องนี้ ให้หยุด instance เดิมก่อน เพื่อไม่ให้ทั้งสองเครื่องแย่งกันตอบคำสั่งหรือแจ้งเตือนซ้ำ

## เตรียมเครื่อง Windows

ติดตั้ง Node.js **24 ขึ้นไป** พร้อม npm และ Python 3 โค้ดใช้ SQLite ที่มากับ Node.js อยู่แล้ว เปิด PowerShell:

```powershell
cd D:\tutel-bot
node --version
npm --version
npm ci
python -m pip install --upgrade yt-dlp
Get-Command yt-dlp
```

`npm ci` ติดตั้งเวอร์ชันตาม lockfile ส่วน `Get-Command` บอกตำแหน่ง yt-dlp หากหาไม่เจอให้ตั้ง path เต็มของไฟล์ executable ใน `.env` ตัว FFmpeg ใช้แพ็กเกจ `ffmpeg-static` ที่ติดตั้งผ่าน npm หรือกำหนด path เองได้

ถ้าโคลนจาก GitHub ครั้งแรก:

```powershell
Copy-Item .env.example .env
```

โฟลเดอร์ที่คัดลอกให้นี้มี `.env` แล้ว หากตั้งค่าจริงไว้แล้วไม่ต้องคัดลอกทับ แก้ค่าที่ต้องใช้:

```dotenv
DISCORD_TOKEN=ใส่-token-ส่วนตัว
CLIENT_ID=ใส่-application-id
GUILD_ID=
YT_DLP_PATH=yt-dlp
FFMPEG_PATH=
CONTROL_HOST=127.0.0.1
CONTROL_PORT=3000
DATABASE_PATH=./data/tutel.sqlite
DATA_DIR=./data
CALENDAR_SETUP_PIN=ใส่-pin-ส่วนตัว
PUBLIC_SITE_DIR=./netlify-public
```

- `CLIENT_ID` คือ Application ID จาก Discord Developer Portal
- `GUILD_ID` คือ ID ของ Discord server สำหรับลงทะเบียนคำสั่งเฉพาะเซิร์ฟเวอร์ทดสอบ ปล่อยว่างได้เมื่อใช้ global commands
- `YT_DLP_PATH` เป็นชื่อคำสั่งหรือ path เต็ม แนะนำใช้ `/` ใน path Windows หรือครอบด้วย `"` หากมีช่องว่าง
- `FFMPEG_PATH` ว่างได้เพื่อใช้ ffmpeg-static
- `NETLIFY_AUTH_TOKEN` และ `NETLIFY_SITE_ID` ว่างไว้จนกว่าจะต้องการเผยแพร่จริง
- `ADMIN_INITIAL_PASSWORD` ใช้เฉพาะตอนสร้างฐานข้อมูลใหม่ ถ้าว่างระบบสุ่มรหัสให้ ถ้าใส่เองต้องยาวอย่างน้อย 10 ตัวอักษร ไม่ได้เปลี่ยนรหัสบัญชีที่มีอยู่แล้ว

```powershell
npm start
```

เปิด **http://127.0.0.1:3000/login** คำสั่งนี้เปิดเว็บ ระบบเตือนปฏิทิน ระบบส่งข้อมูล public (เมื่อกำหนดไว้) และบอท (เมื่อมี token) ถ้าไม่มี token เว็บยังเปิดได้ แต่ฟังก์ชัน Discord ใช้ไม่ได้

## SQLite ต้อง setup อะไรบ้าง

ไม่ต้องติดตั้ง MySQL ไม่ต้องสร้าง user ของฐานข้อมูล และไม่ต้องเปิด port ฐานข้อมูล SQLite คือไฟล์ที่โปรแกรมเปิดอ่าน/เขียนโดยตรง:

```text
หน้า admin → โปรแกรม Node.js → data/tutel.sqlite
                              ↓
                        snapshot calendar.json → Netlify
```

- มีไฟล์เดิม: ใช้บัญชี กิจกรรม และการตั้งค่าเดิม
- ไม่มีไฟล์: โปรแกรมสร้างไฟล์ ตาราง และบัญชีให้ตอนเริ่มครั้งแรก
- ฐานข้อมูลใหม่: login ด้วย `admin` และรหัสใน `data/admin-initial-password.txt` หรือค่าที่ตั้งผ่าน env ต้องเปลี่ยนรหัสครั้งแรก
- บัญชี `viewer` ดูอย่างเดียว รหัสเริ่มต้นอยู่ที่ `data/viewer-initial-password.txt` เฉพาะเมื่อสร้างบัญชีใหม่
- ข้อมูลวันหยุดที่มากับระบบคำนวณจาก source และไฟล์วันพระ ไม่ต้องนำเข้า SQL
- อย่าเอาไฟล์ SQLite ขึ้น GitHub/Netlify เพราะมีข้อมูลบัญชี session กิจกรรม และการตั้งค่าจริง

สำรองแบบได้ข้อมูลครบแม้ฐานข้อมูลกำลังทำงาน:

```powershell
npm run db:backup
```

ไฟล์จะอยู่ใน `backups/` ดู [คู่มือ SQLite](docs/SQLITE.md) สำหรับรายละเอียดและการกู้คืน อย่าคัดลอกเฉพาะไฟล์หลักตอนฐานข้อมูลกำลังเขียน เพราะข้อมูลล่าสุดอาจยังอยู่ในไฟล์ `-wal`

## เชิญบอทและลงทะเบียนคำสั่ง

ใน Discord OAuth2 ใช้ scopes `bot` + `applications.commands` และให้สิทธิ์ View Channels, Send Messages, Connect, Speak ในห้องที่จะใช้งาน

```powershell
npm run register
# ลงทะเบียนเฉพาะ server ทดสอบตาม GUILD_ID
npm run register:guild
```

`register` ส่งคำสั่งไป Discord ไม่ได้เชิญหรือเริ่มบอท Global commands ใช้กับทุก server ที่ติดตั้งบอท ระวังรายการซ้ำหากลงทะเบียนทั้ง global และ guild

| คำสั่ง                                                | การทำงาน                                             |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `/play`, `/queue`, `/skip`, `/stop`                   | เล่นเพลง ดูคิว ข้าม และหยุด/ล้างคิว                  |
| `/pause`, `/resume`, `/nowplaying`, `/leave`          | ควบคุมเพลงและออกจากห้องเสียง                         |
| `/music settings`                                     | ดู/เปลี่ยนแหล่งเพลงของเซิร์ฟเวอร์ (เริ่มต้น YouTube) |
| `/randommusic`                                        | สุ่มเพลงต่อเนื่องจากแหล่งที่เซิร์ฟเวอร์ตั้ง          |
| `/radio list`, `/radio play`                          | ดูสถานีและฟังวิทยุสดตามพื้นที่                       |
| `/calendar setup`                                     | ตั้ง channel แจ้งเตือน ต้องใส่ PIN                   |
| `/calendar add`, `/calendar list`, `/calendar delete` | จัดการกิจกรรม                                        |
| `/calendar config`, `/calendar test`                  | ตั้งเวลาเตือน/ส่งข้อความทดสอบจริง                    |

PIN ใช้เฉพาะการตั้งหรือเปลี่ยน channel ไม่ได้ใช้ตอนสร้างกิจกรรม หน้า admin มีหมวดแจ้งเตือน เวลาส่งสรุปรายวัน ข้อความและสี embed ให้ตั้งเอง

## เว็บไซต์ public บน Netlify

อัปโหลดเฉพาะ `netlify-public/` ห้ามอัปโหลดทั้ง repo หรือหน้า admin, `.env`, `private/`, `data/`

```powershell
npm run calendar:export
```

สร้าง `netlify-public/calendar.json` จากฐานข้อมูลที่กำหนด ไฟล์นี้ถูก Git ignore เพราะมีชื่อและรายละเอียดกิจกรรมจริง ปัจจุบันส่งออกทุกกิจกรรม ยังไม่มีตัวเลือกซ่อนกิจกรรมรายรายการ ต้องตรวจว่าข้อมูลไหนตั้งใจให้ public ก่อนส่งขึ้นเว็บ

หากต้องการซิงก์อัตโนมัติ ตั้ง `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID` ของเว็บไซต์ที่จะใช้ และ `PUBLIC_CALENDAR_URL` จากนั้นเริ่มโปรแกรม หรือส่งครั้งเดียว:

```powershell
npm run calendar:publish
```

ขณะโปรแกรมรันจะตรวจประมาณทุกนาที และส่งเมื่อข้อมูล/ไฟล์เปลี่ยน หน้า public อ่าน snapshot ไม่ได้เชื่อมเข้าฐานข้อมูลหรือ API ส่วนตัวโดยตรง การกรองหมวดหน้าจอไม่เปลี่ยนการส่งแจ้งเตือน Discord

ข้อมูล snapshot ครอบคลุมปีก่อนถึงอีก 2 ปี วันพระมีข้อมูลปี 2025–2035 วันหยุดพิเศษที่ประกาศใหม่ต้องอัปเดตเพิ่มเติม

## รันบน Linux / homeserver

โคลนไป `~/tutel-bot` ตั้ง `.env` ติดตั้ง Node.js 24+, yt-dlp, FFmpeg และใช้ `npm ci` แก้ path ให้ตรงเครื่อง หากต้องเข้าใน LAN ใช้ `CONTROL_HOST=0.0.0.0` หน้า admin ควรเข้าผ่าน LAN/Tailscale ส่วน Tailscale Serve ใช้ทำ HTTPS ได้

ตัวอย่าง service อยู่ที่ `deploy/tutel-hub.service` ตรวจ path ของ Node ให้ตรงเครื่องก่อน:

```bash
mkdir -p ~/.config/systemd/user
cp deploy/tutel-hub.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now tutel-hub.service
journalctl --user -u tutel-hub.service -f
```

หากต้องการทำงานต่อหลัง logout ให้ตั้ง user lingering ด้วย service นี้ควบคุมโปรแกรมทั้งหมด ปุ่มเปิด/ปิดบอทในเว็บควบคุมเฉพาะ Discord เว็บยังเปิดอยู่

Docker เป็นทางเลือก: `docker compose up -d --build` เก็บข้อมูลผ่าน `data/` และ `netlify-public/` เปิด port ที่ localhost และจำกัด RAM ไฟล์ bind mount ต้องให้ UID 1000 ใน container เขียนได้

## โครงสร้างโปรเจกต์

```text
src/bot/          เชื่อม Discord
src/music/        ค้นเพลง สตรีม คิว วิทยุ
src/commands/     slash commands
src/calendar/     ฐานข้อมูล วันสำคัญ แจ้งเตือน ส่ง public snapshot
src/web/          เว็บ server และหน้า admin
netlify-public/   หน้า public แยกส่วน
scripts/          สำรองฐานข้อมูล
deploy/           ตัวอย่าง systemd service
docs/             คู่มือฐานข้อมูล
.env.example      ตัวอย่าง config ไม่มี credential
private/          env production ส่วนตัว ไม่เข้า Git
data/             SQLite และข้อมูล runtime ไม่เข้า Git
backups/          สำรองข้อมูล ไม่เข้า Git
```

## เตรียมขึ้น GitHub

ตั้ง local Git repository ให้แล้ว ยังไม่มี commit และยังไม่ได้อัปโหลด ตรวจไฟล์ก่อน:

```powershell
git status --short
git add .
git diff --cached --stat
git commit -m "Initial Tutel Hub source"
# สร้าง repo เปล่าก่อน แล้วเปลี่ยน OWNER เป็นชื่อบัญชีคุณ
git remote add origin https://github.com/OWNER/tutel-hub.git
git push -u origin main
```

`.gitignore` กัน token, env จริง, ฐานข้อมูล, session, snapshot กิจกรรม, backup และ dependencies ออกจาก Git แต่ไม่ลบ secret ที่เคย commit ไปแล้ว ยังไม่ได้กำหนด license ของโปรเจกต์ เลือกก่อนเผยแพร่ตามที่ต้องการ Dependencies มี license ของตัวเอง รูปเต่าเป็น avatar Discord เดิมของผู้ใช้ ตรวจสิทธิ์เผยแพร่รูปก่อนเปิด repo สาธารณะ

บนมือถือปัดซ้ายเพื่อไปวัน/เดือนถัดไป ปัดขวาเพื่อย้อนกลับ ในตารางสัปดาห์ที่กว้างกว่าจอ การปัดแนวนอนใช้เลื่อนตาราง เอาปุ่ม ＋ แอปออกทั้งหมด Android จะแสดงป๊อปอัปติดตั้งเมื่อเบราว์เซอร์รองรับและอนุญาต มีปุ่มไว้ทีหลังพักการแสดง 7 วัน ต้องใช้ HTTPS ส่วน iPhone ใช้เมนูแชร์ใน Safari เพื่อเพิ่มหน้าจอโฮม

ชื่อบนหน้าจอหลัก: **Tutel📅** ไอคอนเต่าเดิมบนพื้นหลังเข้ม พร้อมหน้าเปิดแอปสั้น ๆ เมื่อเปิดจากแอปที่ติดตั้ง ไม่เปลี่ยน avatar Discord ถ้าอุปกรณ์ยังใช้ชื่อ/ไอคอนเก่า ให้เอาทางลัดเดิมออกและเพิ่มใหม่ ข้อมูลปฏิทินยังอยู่ที่เซิร์ฟเวอร์

UI มือถือ: เมนูเลือกมุมมองตามธีม รายการของวันที่เลือกใต้ปฏิทิน แถบบนซ่อนเมื่อเลื่อนลง/แสดงเมื่อเลื่อนขึ้น ปุ่มเพิ่มกิจกรรมลอยใน admin และข้อความแถบกิจกรรมตัดตามขอบโดยไม่เติม … ไม่เปลี่ยนรูปแบบแจ้งเตือน Discord

บนคอมซ่อนรายการใต้ปฏิทิน หมุนเมาส์เหนือช่องปฏิทินมุมมองเดือน: ลงไปเดือนถัดไป ขึ้นย้อนเดือนก่อน พื้นที่นอกปฏิทินยังเลื่อนหน้าได้ตามปกติ มือถือยังมีรายการด้านล่าง

## Vercel

ชุดเว็บ public สำหรับย้ายโฮสต์อยู่ใน `vercel-public/` ดู [คู่มือ Vercel](docs/VERCEL.md) โฟลเดอร์ `netlify-public/` ยังเก็บชุดเดิมไว้สำหรับ Netlify

## Public calendar API / API ปฏิทิน public

See [Calendar API setup](docs/CALENDAR-API.md). The new public app is `vercel-public`; event changes send data to its API and private Blob instead of creating new deployments. Configure the store and shared secret before activating the homeserver sender.

## คู่มือผู้ดูแลฉบับละเอียด

อ่าน [โครงสร้าง](docs/ARCHITECTURE.md), [PDF ภาษาไทย](docs/manuals/Tutel-Hub-Handbook-TH.pdf), และ [PDF ภาษาอังกฤษ](docs/manuals/Tutel-Hub-Handbook-EN.pdf) ระบบ public ปัจจุบันใช้ `calendar-api` บน Vercel ส่วน Netlify เป็น adapter เดิม

แก้ไฟล์ browser ร่วมที่ `src/web/public/` แล้วรัน `npm run assets:sync` จัดรูปแบบด้วย `npm run format` ตั้ง Root Directory ของ Vercel เป็น `vercel-public`
