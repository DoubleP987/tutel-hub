# Tutel promotional website / เว็บโปรโมท Tutel

Standalone static site. Published separately through GitHub Pages. No bot, database, admin panel, tokens or build step is included here.

## Preview / เปิดดู

Open `index.html` directly, or serve this directory with a static file server for browser checks:

```sh
python -m http.server 4173 --bind 127.0.0.1 --directory promo-site
```

Visit `http://127.0.0.1:4173`. This command only serves local files.

## Files / ไฟล์

- `index.html`: landing page, features, setup, searchable command reference, documentation links and FAQ.
- `guide.html`: bilingual quick-start guide, permissions, privacy and credits.
- `styles.css`: responsive green theme, mobile layout and reduced-motion support.
- `app.js`: Thai/English selection, persisted preference, command filtering and illustrative player controls.
- `config.js`: **public links only**. Edit the invite, GitHub, documentation and calendar destinations here.
- `assets/tutel.png`: existing project logo; no generated artwork.

## Language / ภาษา

On first visit, Thai device/browser language (`th`, `th-TH`, etc.) selects Thai. Other languages select English. An explicit choice overrides device language and is saved in localStorage. All guide and command content is available in both languages.

เปิดครั้งแรกใช้ภาษาไทยเมื่อภาษาเบราว์เซอร์เป็นไทย ภาษาอื่นใช้ภาษาอังกฤษ มีปุ่มสลับภาษาและจำค่าที่เลือกไว้ ไม่มี analytics หรือฟอร์มเก็บข้อมูล

## Publish later / อัปขึ้นเว็บภายหลัง

Upload **the contents of this directory** to any static host. Use `promo-site` as the root directory, no build command, and the directory itself as the output. The public calendar and private admin application are separate projects.

อัปเฉพาะไฟล์ในโฟลเดอร์นี้ไป static hosting ไม่ต้องใช้ token ของ Discord หรือ MongoDB และไม่ต้องอัปไฟล์ `.env` ไปด้วย ก่อนเผยแพร่ให้ตรวจลิงก์ใน `config.js` และข้อมูล privacy ว่าตรงกับการใช้งานจริง

## Design references / แหล่งอ้างอิง

The structure was informed by common bot websites: a clear invite action, feature overview, quick start, command reference, help and FAQ. It uses an original layout and text rather than copying a provider’s page.

- [FredBoat command documentation](https://fredboat.com/docs/commands)
- [Jockie Music](https://www.jockiemusic.com/)
- [Discord bot authorization](https://docs.discord.com/developers/topics/oauth2#bot-authorization-flow)

No fabricated server counts, uptime claims, testimonials or official affiliations are shown. The decorative music panel is explicitly labelled as a demo.

## Theme / ธีม

Light (white) is always the first-visit default, regardless of device theme. The header button switches dark/light and stores `tutel-promo-theme` locally. The same preference applies to both pages. `theme-init.js` applies it before painting.

ธีมเริ่มต้นเป็นขาว ปุ่มพระจันทร์/ดวงอาทิตย์บนหัวเว็บเปลี่ยนธีมและจำไว้ในเบราว์เซอร์ ใช้ร่วมกันทั้งหน้าหลักและคู่มือ

## GitHub Pages

Website: https://doublep987.github.io/tutel-hub/

The workflow `.github/workflows/promo-pages.yml` uploads only `promo-site/`. No build, dependencies or bot secrets are published. Settings → Pages must use GitHub Actions.

## Version / เวอร์ชัน

Current release: **1.0.0**. When releasing, update `package.json`, `package-lock.json`, `promo-site/config.js`, and the versions in the root READMEs together. The footer reads the public version from config.js.
