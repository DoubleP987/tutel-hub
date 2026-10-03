# Radio and control panel / วิทยุและหน้าควบคุม

## Music menus and standby / เมนูเพลงและสแตนบาย

Press **🔀 เปิดสุ่ม / Enable random** in the latest music panel. One dropdown includes all 25 choices, including mixed mode and Japanese music. There is no separate genre button. Opening the menu does not start random playback until a genre is selected. Choosing one remembers it for that guild and starts continuous random music. The current track finishes first. The menu is private to its opener; only someone in the bot's voice channel can apply the selection.

`/join` joins the user's voice channel and shows the music panel without starting audio. After five minutes with no track, queue, radio or random mode, the bot leaves and removes its panel. Starting playback cancels the standby countdown; finishing playback starts a new idle countdown. The separate empty-voice timeout can still leave an empty room earlier.

กด **🔀 เปิดสุ่ม** ในแผงเพลงล่าสุด แล้วเลือกแนวจากเมนูได้เลย ไม่ต้องพิมพ์ `/randommusic` การเลือกจะเปิดสุ่มต่อเนื่องและจำแนวแยกแต่ละเซิร์ฟเวอร์ ใช้ `/join` ให้บอทมารอ ถ้าไม่มีเพลงเล่น 5 นาทีจะออกเองและลบแผงควบคุม

## Radio / วิทยุ

`/radio list` is visible only to its opener, with Previous, Next and Refresh status buttons that update the same message. Each list preserves its category/area and station snapshot for twelve minutes; after expiry or a restart, open the command again. Buttons are restricted to the opener and original guild/channel. The optional `page` argument still works. The list checks ten stations per page, using a one-second audio sample on demand. Two probes at most run concurrently. Successful results are cached for three minutes; failed results for thirty seconds. No radio media is saved to disk. Categories: `music`, `news`, `talk`, `sport`, `local`.

`/radio list` เห็นเฉพาะคนที่เปิด มีปุ่ม **ก่อนหน้า / ถัดไป / ตรวจสถานะใหม่** เปลี่ยนหน้าในข้อความเดิมโดยเก็บหมวดและภาคที่เลือกไว้ รายการหมดอายุใน 12 นาทีหรือเมื่อบอทรีสตาร์ท ให้เปิดคำสั่งใหม่ เมนูสุ่มเพลงมีช่องเดียว รวม 25 ตัวเลือกและ **คละแนว** กดเปิดสุ่มแล้วเลือกแนวเพื่อเริ่ม ไม่มีปุ่มแนวสุ่มแยก

มีสถานีแนะนำ 21 สถานี และค้นสถานีเพิ่มเติมจาก Radio Browser ได้ รายการแสดงครั้งละ 10 สถานี ตรวจโดยถอดเสียงหนึ่งวินาที ไม่บันทึกเพลงลงดิสก์ สถานะมีเสียง, สตรีมเงียบ, ออฟไลน์, ปฏิเสธการเข้าถึง, หาโดเมนไม่เจอ และไม่ตอบกลับ แยกจากกัน สถานะเงียบไม่ได้แปลว่าปิดสถานี การเชื่อมต่อล้มเหลวจากเครื่องบอทไม่ได้พิสูจน์ว่าสถานีหยุดออกอากาศ FM

Examples / ตัวอย่าง:

- `/radio list category:news` — ข่าวและจราจร เช่น JS100, FM91, MCOT News, NBT
- `/radio list category:talk` — สาระและการศึกษา เช่น Thinking Radio, Chula Radio
- `/radio list category:sport` — Active Radio FM99
- `/radio list page:2` — หน้าถัดไป
- `/radio play station:js100` or `station:chula` — เล่นสถานี

Endpoint URLs and directory metadata can become stale. Playback checks actual decoding before claiming success. Offline stations are retained so users can see their status and retry later.

## Calendar commands / คำสั่งปฏิทิน

`/calendar` is registered per guild, never globally. A guild must have a saved notification channel and notifications enabled. Configure these in the admin panel first. The active bot checks configuration every thirty seconds and adds/removes only the guild's calendar command. Discord clients can take additional time to refresh cached menus. Calendar events remain stored when notifications are disabled.

ตั้ง channel และเปิดแจ้งเตือนในหน้า admin ก่อน คำสั่ง `/calendar` จึงปรากฏเฉพาะดิสที่เปิดใช้ ปิดแจ้งเตือนแล้วคำสั่งถูกนำออกภายในรอบตรวจ 30 วินาที ข้อมูลกิจกรรมไม่ได้ถูกลบ

## Login theme / ธีมหน้า login

The account theme restored after login is also remembered in browser local storage, so the next login screen uses it. Device theme changes remain supported in system mode. The setting is per origin: LAN IP and Tailscale hostname have separate browser storage.

ธีมของบัญชีถูกจำไว้บนเบราว์เซอร์เพื่อใช้ที่หน้า login ครั้งถัดไปด้วย ลิงก์ IP บ้านกับ Tailscale เป็นคนละ origin จึงมีค่าที่จำแยกกัน

## Live logs / Log สด

Admin → Log บอท / Bot logs. The panel polls every three seconds while visible, with pause, refresh and clear-screen controls. The API requires an admin session and follows the active cluster node. If the bot is disabled, local service logs remain accessible. Only current-process logs are shown; a restart resets history. Journald remains the persistent history (`tutel log`).

Backend history is limited to 500 lines, each 2,000 characters; an API response contains up to 200 lines. Browser rendering uses text content rather than HTML. Known environment credentials, MongoDB credentials and Discord interaction tokens are redacted before storage. Avoid logging arbitrary sensitive user data: redaction is not a replacement for careful logging.

หน้า log ดูได้เฉพาะ admin มีอัปเดตสด หยุดอัปเดต รีเฟรช และล้างหน้าจอ การล้างหน้าจอไม่ได้ลบ log เซิร์ฟเวอร์ ประวัติหน้านี้เริ่มใหม่เมื่อบริการรีสตาร์ท ส่วนประวัติเดิมดูผ่าน `tutel log`
