# Radio and control panel / วิทยุและหน้าควบคุม

## Music menus and radio / เมนูเพลงและวิทยุ

/join joins voice and displays the existing shared player without starting audio. Five idle minutes with no queue, song, random playback or radio triggers leave. A new play request edits the same message even if requested from another text channel; leaving removes it. Restart does not restore audio or the in-memory queue.

The Random button always opens a private genre selector. Its 25 choices include mixed music and Japanese music. Selecting a genre while random playback is active keeps the current song playing, discards unsuitable preloaded random audio, and uses the new genre for subsequent random songs. User-queued songs still have priority. Disable random is inside this private menu.

The single Radio button opens a private station selector while in music mode. Select a station to validate it and prepare audio before replacing the music. The old queue and random preference are retained. Press the same Radio button while radio is active to return to music. An interrupted song restarts from its beginning; the queue is not a seekable recording. There is no separate Return to music button.

Radio list has ten station choices per page, region/type filters, search, page navigation, a refresh check and the last station. The player radio selector uses at most twenty choices per page. Only the opener can use the private selector, and playback requires the same voice channel as the bot. Station health is measured from decoded samples, not just HTTP status. A one-second silent sample may mean a quiet interval rather than an offline station.

Private interactive messages have a hard three-minute lifetime from creation; navigation does not extend it. Expired visible buttons are rejected and ask the user to reopen the menu. Text-only music/radio confirmations expire fifteen seconds after work finishes. The public music panel has no three-minute timer. Discord modals cannot be remotely closed by the bot. Graceful shutdown cleans private replies; a crash cannot guarantee timely message deletion.

/join เข้าห้องเสียงและแสดงแผงเดิมโดยไม่เริ่มเล่นอะไร ว่างครบ 5 นาทีโดยไม่มีคิว เพลง สุ่มหรือวิทยุจะออกเอง การสั่งเล่นใหม่แก้ข้อความเดิมแม้เรียกจากคนละช่องแชท ไม่ส่งแผงใหม่ซ้ำ ออกจากห้องแล้วลบแผง รีสตาร์ตไม่กู้คืนเสียงและคิวใน RAM

ปุ่มสุ่มเปิดเมนูแนวเพลงเฉพาะคนกดเสมอ มี 25 ตัวเลือกรวมคละแนวและเพลงญี่ปุ่น เปลี่ยนแนวตอนเปิดสุ่มได้ เพลงปัจจุบันเล่นต่อ ยกเลิกเพลงสุ่มที่เตรียมไว้แล้วไม่ตรงแนวใหม่ และสุ่มเพลงถัด ๆ ไปตามแนวใหม่ เพลงที่ผู้ใช้เพิ่มไว้ในคิวยังมีสิทธิ์เล่นก่อน ปุ่มปิดสุ่มอยู่ในเมนูส่วนตัวนี้

เหลือปุ่มวิทยุปุ่มเดียว กดตอนฟังเพลงเพื่อเลือกสถานี ตรวจสถานีและเตรียมเสียงก่อนแทนเพลง เก็บคิวเพลงและความชอบโหมดสุ่มไว้ กดปุ่มวิทยุอีกครั้งขณะวิทยุทำงานจะกลับไปเล่นเพลง เพลงที่ถูกพักเริ่มใหม่จากต้นเพลง ไม่ได้จำตำแหน่งเสียง ไม่มีปุ่มกลับไปเพลงแยกอีกแล้ว

radio list เลือกเล่นได้ 10 สถานีต่อหน้า กรองพื้นที่และประเภท ค้นหา เลื่อนหน้า ตรวจสถานะใหม่ และเปิดสถานีล่าสุดได้ ตัวเลือกวิทยุจากแผงใช้ไม่เกิน 20 สถานีต่อหน้า ใช้ได้เฉพาะคนเปิดและต้องอยู่ห้องเสียงเดียวกับบอท สถานะมีเสียงตรวจจากการถอดเสียงจริง ไม่ได้ดูเพียง HTTP การตรวจหนึ่งวินาทีที่เงียบอาจเป็นช่วงเงียบ ไม่ได้ยืนยันว่าสถานีปิด

เมนูส่วนตัวที่มีปุ่มหมดอายุสูงสุด 3 นาทีจากเปิด ไม่ต่อเวลาเมื่อเลื่อนหน้า ถ้าข้อความยังมองเห็นหลังหมดอายุ จะปฏิเสธปุ่มและให้เปิดเมนูใหม่ คำยืนยันเพลงและวิทยุสั้น ๆ หายหลังงานเสร็จ 15 วินาที แผงเพลงหลักไม่จับเวลา 3 นาที บอทปิดฟอร์ม modal ของ Discord แทนผู้ใช้ไม่ได้ การปิดปกติล้างข้อความส่วนตัว แต่เมื่อโปรเซส crash ไม่รับประกันว่าจะลบทันเวลา

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

## Current operation update / อัปเดตการทำงาน

[Current operation, 4 October 2026 / การทำงานปัจจุบัน](CURRENT-OPERATIONS.md) documents the single random-genre selector, private music/radio replies, per-guild playback status, host cards, sidebar logout and working log route.

## Short private responses / ข้อความส่วนตัวสั้น ๆ

Music/radio text-only confirmations and errors disappear automatically 15 seconds after the command handler finishes. Pending deferred/progress responses remain while a lookup is running. Replies with interactive components, such as Settings, genre selection or paginated lists, keep their normal lifetime. The newest private reply still replaces the previous one for the same user/channel. The public music panel is unaffected.

คำยืนยันและข้อผิดพลาดแบบข้อความของเพลง/วิทยุหายเอง 15 วินาทีหลังคำสั่งทำงานเสร็จ ระหว่างกำลังโหลดไม่เริ่มนับ เมนูที่มีปุ่มหรือ dropdown ยังอยู่ให้ใช้งาน ข้อความใหม่ยังแทนข้อความเก่าของผู้ใช้และช่องเดียวกัน แผงเพลงสาธารณะไม่หายตาม timer นี้
