# ตั้งภาษาบอทและคำสั่ง /help

**Current behavior / การทำงานล่าสุด:** [Music controls, metadata, Loop and menu expiration](MUSIC-CONTROLS.md). This guide takes precedence over older behavior examples below. / ใช้คู่มือนี้แทนตัวอย่างพฤติกรรมรุ่นเก่าด้านล่าง

## ตั้งค่าในโค้ด

เริ่มต้นใช้ภาษาไทย แก้ `src/config/bot.js`:

```js
export const botConfig = Object.freeze({
  language: 'th', // เปลี่ยนเป็น 'en' เพื่อใช้ภาษาอังกฤษ
  website: 'https://tutelbot.vercel.app',
  repository: 'https://github.com/DoubleP987/tutel-hub',
});
```

หรือกำหนดใน `.env`:

```dotenv
BOT_LANGUAGE=en
BOT_WEBSITE_URL=https://tutelbot.vercel.app
```

หาก `.env` มี `BOT_LANGUAGE` จะใช้ค่านั้นก่อนโค้ด ถ้าต้องการใช้ค่าจากโค้ดให้ลบตัวแปรนี้หรือปล่อยว่าง รับเฉพาะ `th` กับ `en` ค่าผิดจะหยุดเริ่มระบบพร้อมข้อความแจ้งสาเหตุ เปลี่ยนแล้วรีสตาร์ตบอทด้วย `npm start` หรือ `systemctl --user restart tutelbot.service` หากใช้เครื่องหลักกับสำรองให้ตั้งภาษาให้ตรงกัน ทั้งสองเครื่องที่ใช้งานจริงยังใช้ภาษาไทย

## ส่วนที่เปลี่ยนภาษา

ปุ่มเครื่องเล่นรวมถึง Loop สถานะเพลง คิวและหน้าต่างเพิ่มเพลง คำตอบและคำอธิบาย slash commands ข้อความค้นวิทยุ ปุ่มปฏิทิน หัวข้อสรุปรายวัน วันที่ และชื่อหมวดแจ้งเตือนมาตรฐาน เขตเวลายังคงเป็น Asia/Bangkok ชื่อคำสั่ง `/play`, `/radio`, `/calendar`, `/help` และค่าของ option ไม่เปลี่ยน

ชื่อเพลง ชื่อสถานี ชื่อและรายละเอียดกิจกรรมที่ผู้ใช้เพิ่ม รวมถึง template แจ้งเตือนที่บันทึกเองไม่ถูกแปล เว็บ admin เว็บปฏิทิน และเว็บโปรโมทมีระบบภาษา/ธีมของตนเอง การตั้งภาษาบอทไม่ได้เปลี่ยนเว็บไซต์เหล่านั้น ข้อความแจ้งเตือนเก่าที่ส่งแล้วไม่ถูกเขียนใหม่อัตโนมัติ

คำแปลอังกฤษอยู่ใน `src/i18n/en.json` โดยใช้ข้อความไทยเดิมเป็น key ส่วน `src/i18n/bot.js` เลือกภาษาและแทนค่า `{0}`, `{1}` หากเพิ่มคำแปลให้คง placeholder ให้ตรงกัน ห้ามใส่ secret ในไฟล์คำแปล

## คำอธิบายคำสั่งและโปรไฟล์

เปลี่ยนภาษาแล้วลงทะเบียนคำอธิบายคำสั่งใหม่:

```sh
npm run register
```

ต้องใช้ credential ของ Discord การทดสอบเฉพาะ guild ใช้ `npm run register:guild` แต่ไม่ควรทิ้งคำสั่ง guild ซ้ำกับ global

คำอธิบายโปรไฟล์เป็นการตั้งค่าบน Discord แยกจากข้อความ runtime ใช้คำสั่งนี้เมื่ออยากบันทึกคำอธิบายและลิงก์เว็บด้วยภาษาปัจจุบัน:

```sh
npm run profile:update
```

อัปเดตเฉพาะ Description ของ application ไม่เปลี่ยนรูป แบนเนอร์ token หรือสิทธิ์เชิญ ข้อความอยู่ใน `src/config/profile.js` หรือแก้เองที่ Discord Developer Portal → application → General Information → Description

## /help แบบเห็นคนเดียว

`/help` ตอบด้วย `MessageFlags.Ephemeral` (64) เห็นเฉพาะคนสั่ง มีปุ่มเปิดเว็บ คู่มือ และ GitHub กดแล้วเปิดเบราว์เซอร์ ไม่ส่งข้อความเพิ่มในแชทสาธารณะ ใช้ได้โดยไม่ต้องอยู่ห้องเสียงหรือมีสิทธิ์ admin

- เว็บ: https://tutelbot.vercel.app
- คู่มือ: https://tutelbot.vercel.app/guide.html

## ตรวจสอบ

`node --test tests/bot-language.test.js` ตรวจทั้งสองภาษา ค่าปุ่มและคำสั่ง ค่าเริ่มต้นไทย placeholder ความเป็นส่วนตัวของ /help และการรักษาข้อความกิจกรรมที่ผู้ใช้ใส่เอง

[English](BOT-LANGUAGE.md)
