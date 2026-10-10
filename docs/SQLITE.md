# SQLite setup and backups / การตั้งค่าและสำรอง SQLite

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

## English

SQLite is an embedded database: Node.js opens a local file directly. MySQL is a separate database server that requires installation, user credentials and a connection. For one lightweight homeserver, SQLite keeps setup simple. It supports multiple readers and serialized writes; it is not a shared network filesystem database or a replicated multi-server service.

### Configuration

```dotenv
DATABASE_PATH=./data/tutel.sqlite
DATA_DIR=./data
```

Start commands from the repository root so relative paths resolve correctly. `DATABASE_PATH` selects the actual database. `DATA_DIR` stores one-time initial account password files; it does not move the database automatically. Match both locations unless you deliberately separate them.

On first startup the app creates the parent directory, opens/creates SQLite, creates tables, applies additive schema changes, and initializes accounts only when absent. Fresh admin passwords are random unless `ADMIN_INITIAL_PASSWORD` is configured; initial accounts must change their password. An existing database preserves its existing users.

Main tables: `users` (password hashes), `sessions` (hashed login tokens/expiry), `events` (custom/recurring events and colors), `guild_config`, `app_settings` (reminder/display settings), `reminder_log`, `calendar_deliveries`, and `calendar_latest` (delivery deduplication/latest message). SQLite is not encrypted by this app. Passwords are hashed, but event details remain readable to someone with access to the file.

### WAL files

`tutel.sqlite-wal` temporarily stores recent transactions; `tutel.sqlite-shm` coordinates WAL access. They are normal. Do not delete them while the app is running, or copy only the main file as an online backup.

### Backup

```powershell
npm run db:backup
# Optional custom output path (must not already exist)
npm run db:backup -- ./backups/manual.sqlite
```

The helper uses SQLite `VACUUM INTO` for a consistent snapshot, including committed WAL data. It does not reset accounts, send Discord messages, or publish a website. Keep backup files private and outside public hosting. Also keep a separate secure backup of `.env` if you need credentials during recovery.

### Restore on Windows

1. Stop every local process/service that uses this database (`Ctrl+C` for a foreground process).
2. Save the current `data/tutel.sqlite` and any matching `-wal`/`-shm` files in a **separate private recovery folder**. Move them out of `data/`; do not mix stale WAL sidecars with a restored snapshot.
3. Copy the chosen consistent backup to `data/tutel.sqlite`.
4. Confirm `.env` points to this file; start the app from the repository root.
5. Existing backup accounts/passwords and events are restored. A backup also contains delivery history as of that time; restoring older history can affect reminder deduplication.

Do not restore over a live file. Never share the database or password files in a support screenshot/repository. To use a completely fresh database, change `DATABASE_PATH` and `DATA_DIR` to a new private directory rather than deleting your original data.

## ภาษาไทย

SQLite คือฐานข้อมูลที่โปรแกรมเปิดไฟล์โดยตรง ส่วน MySQL ต้องเปิดเซิร์ฟเวอร์ฐานข้อมูลแยก สำหรับ homeserver เครื่องเดียว SQLite ใช้ง่ายและไม่ต้องดูแล service เพิ่ม อ่านพร้อมกันได้ แต่การเขียนจะเรียงกัน ไม่เหมาะเอาไฟล์ไปแชร์บน network drive ให้หลายเครื่องเขียนพร้อมกัน

### ตั้งค่า

```dotenv
DATABASE_PATH=./data/tutel.sqlite
DATA_DIR=./data
```

ให้รันคำสั่งจาก root ของโปรเจกต์ `DATABASE_PATH` เลือกไฟล์ฐานข้อมูลจริง ส่วน `DATA_DIR` ใช้เก็บรหัสผ่านบัญชีที่สร้างครั้งแรก ไม่ได้ย้ายไฟล์ฐานข้อมูลให้อัตโนมัติ

ครั้งแรกระบบสร้าง folder/ไฟล์ ตาราง คอลัมน์เพิ่มเติม และบัญชีที่ยังไม่มีให้เอง ไม่ต้องเปิดโปรแกรมจัดการฐานข้อมูลหรือ import SQL ฐานข้อมูลใหม่จะสุ่มรหัส admin ถ้าไม่ได้กำหนด `ADMIN_INITIAL_PASSWORD` บัญชีเดิมไม่ถูกสร้างทับ

เก็บบัญชี รหัสผ่านที่ hash แล้ว session กิจกรรม สี การตั้งค่า channel และประวัติส่งเตือนในไฟล์นี้ ตัวไฟล์ไม่ได้เข้ารหัส แม้รหัสผ่านจะ hash แต่คนที่ได้ไฟล์ไปยังอ่านรายละเอียดกิจกรรมได้

### ทำไมมี -wal และ -shm

`-wal` เก็บการเขียนล่าสุดก่อนรวมลงไฟล์หลัก ส่วน `-shm` ใช้ประสานงาน เป็นไฟล์ปกติ ห้ามลบทิ้งขณะโปรแกรมทำงาน และอย่า copy เฉพาะ `.sqlite` ตอนกำลังรันเพื่อทำ backup

### สำรอง

```powershell
npm run db:backup
npm run db:backup -- ./backups/manual.sqlite
```

คำสั่งใช้กลไกของ SQLite ทำ snapshot ที่ข้อมูลสอดคล้องกัน รวมข้อมูลที่เขียนสำเร็จใน WAL ด้วย ชื่อปลายทางต้องยังไม่มีไฟล์ เก็บ backup และสำเนา `.env` ไว้ส่วนตัว ไม่ส่ง Discord หรือเผยแพร่ Netlify ระหว่างสำรอง

### กู้คืนบน Windows

1. หยุดทุกโปรแกรม/service ที่ใช้ฐานข้อมูลไฟล์นี้ก่อน ถ้ารันใน terminal ให้กด `Ctrl+C`
2. เก็บไฟล์หลักเดิมและ `-wal`/`-shm` ที่คู่กันไปไว้ folder กู้คืนส่วนตัวอีกแห่ง แล้วเอาออกจาก `data/` เพื่อไม่ให้ sidecar เก่าปะปนกับไฟล์ที่กู้คืน
3. copy backup ที่เลือกมาเป็น `data/tutel.sqlite`
4. ตรวจ `.env` ว่าชี้ไฟล์นี้แล้วเริ่มโปรแกรมจาก root โปรเจกต์
5. จะได้บัญชี รหัสผ่าน กิจกรรมและการตั้งค่าตาม backup ประวัติส่งเตือนก็ย้อนตามด้วย การใช้ backup เก่าอาจมีผลต่อการป้องกันแจ้งเตือนซ้ำ

อย่ากู้คืนทับไฟล์ที่ยังรันอยู่ ถ้าจะเริ่มฐานข้อมูลว่าง ให้เปลี่ยน `DATABASE_PATH` และ `DATA_DIR` เป็น folder ใหม่แทนการลบข้อมูลเดิม
