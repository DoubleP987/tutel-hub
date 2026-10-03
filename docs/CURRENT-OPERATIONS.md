# Current operation / การทำงานปัจจุบัน

Updated 4 October 2026 / อัปเดต 4 ตุลาคม 2569

This is the current-behavior reference; it supersedes conflicting baseline handbook descriptions. The same update is appended to both handbook PDFs.

เอกสารนี้ใช้แทนพฤติกรรมที่ขัดกันในคู่มือฉบับพื้นฐาน และเพิ่มเนื้อหาเดียวกันท้าย PDF ทั้งสองภาษา

## Architecture, storage and publication / โครงสร้าง ฐานข้อมูล และการเผยแพร่

The active cluster node owns Discord login, audio, calendar scheduling and outbound public-calendar publication. Homeserver is preferred in automatic mode; Oracle is the standby node. A renewable MongoDB lease and a local watchdog prevent an inactive node from continuing bot work.

MongoDB Atlas shares users, password hashes, sessions, events, settings and delivery records. SQLite remains supported for standalone installations. Audio streams, playback queues, radio-list sessions and private-reply references remain in process memory and are not resumed after restart or failover.

The private admin panel runs locally on each server. Authorized commands to the active node travel through encrypted MongoDB jobs, so an inbound public Oracle address is unnecessary. Admin sessions, role authorization and CSRF checks still apply.

Vercel public-calendar updates use the authenticated snapshot API and private Blob storage. The configured sync secret authenticates the sender. Public snapshots exclude authentication data. Adding an event sends data; it does not require rebuilding or deploying the public site. Homeserver IP changes do not affect outbound synchronization.

เครื่องที่ถือสิทธิ์ทำงานในคลัสเตอร์รับผิดชอบการล็อกอิน Discord เล่นเสียง ตั้งเวลาแจ้งเตือน และส่งข้อมูลปฏิทินสาธารณะ โหมดอัตโนมัติใช้ homeserver เป็นหลักและ Oracle เป็นเครื่องสำรอง MongoDB lease ที่ต่ออายุเป็นระยะและ watchdog บนเครื่องช่วยหยุดบอทเมื่อหมดสิทธิ์ทำงาน

MongoDB Atlas เก็บบัญชี hash รหัสผ่าน session กิจกรรม ค่าและประวัติการแจ้งเตือนร่วมกัน ส่วน SQLite ยังใช้ได้เมื่อรันแบบเครื่องเดียว เสียง คิวเพลง session รายการวิทยุและตัวอ้างอิงข้อความส่วนตัวอยู่ในหน่วยความจำ จึงไม่กลับมาเล่นต่อเมื่อรีสตาร์ทหรือสลับเครื่อง

หน้า admin อยู่บนแต่ละเซิร์ฟเวอร์ คำสั่งที่ยืนยันสิทธิ์แล้วส่งไปเครื่องที่รันจริงผ่านงานเข้ารหัสใน MongoDB จึงไม่ต้องเปิด public IP ของ Oracle ระบบยังตรวจ session สิทธิ์ admin และ CSRF ตามเดิม

ปฏิทินสาธารณะบน Vercel รับ snapshot ผ่าน API ที่ตรวจ secret และเก็บใน private Blob ข้อมูลไม่รวมรหัสผ่านหรือ session การเพิ่มกิจกรรมเป็นการส่งข้อมูล ไม่ต้อง deploy เว็บใหม่ IP บ้านเปลี่ยนไม่กระทบการเชื่อมต่อที่ส่งออกจากบ้าน

## Music, radio and Discord message lifecycle / เพลง วิทยุ และวงจรข้อความ Discord

YouTube is the default search source per guild; a guild can select SoundCloud. Oracle may enforce its SoundCloud override. Explicit provider links preserve their provider. Playlist links are enumerated as bounded flat metadata; a video-plus-playlist URL asks whether to queue one song or the playlist. Audio is piped through yt-dlp and FFmpeg instead of being saved as media files.

The Enable random button opens one private dropdown with 25 choices, including Mixed. Anime was removed; Japanese music remains. A selection starts continuous random music after the current track, remembers the guild genre and preserves queued songs. The running-mode button disables random. Searches favor single tracks and reject live, compilation and longplay candidates; this is search discovery, not an official chart feed.

Music and radio command acknowledgments, search ambiguity, progress and errors are ephemeral: only the requesting user sees them and Discord offers Dismiss. The newest private response replaces the older response for that user/channel. The public music panel is the shared activity record. Existing old public messages are not deleted retroactively.

The latest play request moves the panel and removes its predecessor. Leaving/disconnecting voice or stopping the bot removes panels; stopping audio while connected keeps the panel. Loop cycles Off, Track and Queue. Join waits without audio and leaves after five idle minutes; the separate empty-room timeout is 120 seconds by default.

Radio list is private with Previous, Next and Refresh buttons. Ten station checks per page use cached short decoding probes; list sessions expire after twelve minutes. Online, silent, blocked, unreachable and offline are different outcomes. A successful radio probe shows decoded samples, not proof that every listener hears sound. FFmpeg can be selected through FFMPEG_PATH.

ค่าเริ่มต้นการค้นหาเป็น YouTube แยกต่อเซิร์ฟเวอร์และเลือก SoundCloud ได้ Oracle อาจบังคับใช้ SoundCloud ตามค่าของเครื่อง ลิงก์ตรงใช้ผู้ให้บริการของลิงก์ Playlist อ่านเฉพาะรายการ metadata แบบจำกัดจำนวน ลิงก์ที่มีทั้งเพลงและ playlist จะถามว่าจะเพิ่มเพลงเดียวหรือทั้งรายการ เสียงส่งผ่าน pipe ของ yt-dlp และ FFmpeg ไม่บันทึกไฟล์เพลงลงดิสก์

ปุ่มเปิดสุ่มเปิด dropdown ส่วนตัวช่องเดียว 25 ตัวเลือก รวมคละแนว ตัดอนิเมะออกแต่ยังมีเพลงญี่ปุ่น เลือกแล้วเริ่มสุ่มต่อเนื่องหลังเพลงปัจจุบัน จำแนวแยกเซิร์ฟเวอร์ และให้คิวที่เพิ่มไว้เล่นก่อน ปุ่มขณะสุ่มใช้ปิดสุ่ม การค้นหาเน้นเพลงเดี่ยวและกรองรายการสด คลิปรวม และ longplay ไม่ใช่ API อันดับเพลงสด

คำตอบคำสั่งเพลงและวิทยุ รวมผลค้นหาคลุมเครือ ความคืบหน้าและข้อผิดพลาดเป็น ephemeral ผู้สั่งเห็นคนเดียวและกด Dismiss ได้ ข้อความส่วนตัวใหม่แทนอันเก่าในผู้ใช้และช่องเดียวกัน แผงเพลงเป็นข้อความร่วมสำหรับดูการทำงาน ข้อความสาธารณะเก่าไม่ได้ถูกลบย้อนหลัง

คำสั่งเปิดเพลงล่าสุดย้ายแผงและลบแผงเก่า เมื่อบอทออกจากห้องหรือหยุดบอทแผงจะหาย แต่หยุดเสียงขณะที่ยังอยู่ในห้องจะคงแผงไว้ Loop สลับปิด วนเพลง วนคิว Join ให้รอโดยไม่เปิดเสียงและออกเมื่อว่างห้านาที ส่วนไม่มีคนในห้องใช้ timeout แยกเริ่มต้น 120 วินาที

รายการวิทยุเห็นคนเดียวและมีปุ่มก่อนหน้า ถัดไป ตรวจสถานะใหม่ ตรวจสิบสถานีต่อหน้าด้วยการถอดเสียงสั้นและ cache session หมดอายุสิบสองนาที สถานะมีเสียง เงียบ ถูกบล็อก ติดต่อไม่ได้และออฟไลน์แยกกัน ผล probe ไม่ยืนยันว่าเสียงถึงผู้ฟังทุกคน เลือก FFmpeg ด้วย FFMPEG_PATH ได้

## Calendar notifications and command visibility / แจ้งเตือนปฏิทินและการแสดงคำสั่ง

One automatic agenda is delivered per configured guild/channel and Thai date at dayTime, default 07:00 Asia/Bangkok. Category and nonholiday filters apply. Empty days send nothing. Event edits update the recorded daily message. Long agendas include a complete text attachment.

This daily summary replaces the earlier automatic per-event and previous-day reminder schedules. Legacy offsets remain metadata and do not generate additional automatic messages. Restart catch-up is for today only; database/Discord deduplication is best effort because no cross-system transaction exists.

Calendar buttons show a private link to the correct date/event for thirty seconds. Only the latest notification keeps its calendar button. Calendar slash commands are registered per guild only when its notification channel is configured and notifications are enabled; configuration is checked every thirty seconds.

Admin event editing and the public read-only calendar use the same published event data. The public frontend is separate from the private admin panel. Event category, color, all-day/timed boundaries and recurrence are retained in the calendar model.

ส่งสรุปรายวันอัตโนมัติหนึ่งข้อความต่อเซิร์ฟเวอร์ ช่อง และวันที่ไทย ตาม dayTime เริ่มต้น 07:00 Asia/Bangkok ใช้ตัวกรองหมวดและวันไม่หยุด วันที่ไม่มีรายการไม่ส่ง เมื่อแก้กิจกรรมจะปรับข้อความของวันเดิม ถ้ายาวมากแนบไฟล์ข้อความที่มีรายการครบ

สรุปรายวันใช้แทนการแจ้งแยกกิจกรรมและแจ้งก่อนหนึ่งวันแบบเดิม offset เก่าเหลือเป็น metadata ไม่ส่งเพิ่ม เมื่อรีสตาร์ทตามย้อนหลังเฉพาะวันนี้ การกันส่งซ้ำระหว่างฐานข้อมูลกับ Discord เป็น best effort เพราะไม่มี transaction ครอบสองระบบ

ปุ่มปฏิทินส่งลิงก์ส่วนตัวไปวันและกิจกรรมที่ถูกต้องแล้วหายในสามสิบวินาที มีปุ่มเฉพาะการแจ้งล่าสุด คำสั่ง calendar ลงทะเบียนรายเซิร์ฟเวอร์เมื่อกำหนดช่องและเปิดแจ้งเตือนแล้ว ตรวจค่าทุกสามสิบวินาที

หน้า admin และปฏิทินสาธารณะอ่านข้อมูลกิจกรรมชุดเดียวกันที่เผยแพร่ แต่หน้า public อ่านอย่างเดียวและแยกจาก admin หมวด สี กิจกรรมทั้งวันหรือมีเวลา และการทำซ้ำเป็นข้อมูลในโมเดลปฏิทิน

## Control panel, logs, operation and verification / หน้าควบคุม Log การดูแล และการตรวจสอบ

Bot controls show every connected guild, its current track or radio station, voice channel, queue length and random mode. Playback states distinguish disconnected, standby, loading, music, radio and paused. The visible admin page refreshes every five seconds; background tabs and focused music forms pause this refresh to avoid unnecessary work and losing edits.

Host cards distinguish the selected mode from the currently active lease owner. The active badge remains visible on mobile. Selecting the already-selected card sends no request. Pending switches disable the other choices. Changing the host while the bot is disabled preserves its disabled state. Switching hosts loses the in-memory queue and playback.

Logout is at the end of sidebar navigation, with a compact labeled icon on mobile. Control/settings/log pages use a bounded reading width, spaced cards and theme-aware controls. Calendar layout is preserved.

Log access requires an admin session. The browser loads /bot-logs.js, served explicitly by assets.js, then requests /api/bot/logs. The missing asset route caused the former empty screen; it now returns JavaScript successfully. The visible log page polls every three seconds, supports pause/refresh/clear and resets on instance changes. Clear affects the display, not server history.

Log history is bounded to 500 lines per process, 2,000 characters per line and 200 entries per response. Known secrets are redacted. A restart resets this in-memory history; use tutel log for journald history. Forwarding follows the active cluster node.

Both servers use the user service tutelbot.service. The tutel shortcuts offer start, stop, restart, status and log. Deploy only the files required for an approved task, keep backups and preserve real environment files. GitHub pushes are separate from server deployment and require the user instruction. This update passed 43 automated tests and verified live control status and nonempty logs in the homeserver browser.

หน้าควบคุมแสดงแต่ละดิส ชื่อเพลงหรือสถานี ห้องเสียง จำนวนคิวและโหมดสุ่ม แยกสถานะไม่ได้เข้าห้อง รอ โหลด เพลง วิทยุ และพัก หน้า admin ที่เปิดอยู่รีเฟรชทุกห้าวินาที หยุดเมื่อแท็บอยู่เบื้องหลังหรือโฟกัสฟอร์มเพลง เพื่อไม่แย่งการแก้ค่าและไม่ทำงานเกินจำเป็น

การ์ด host แยกโหมดที่เลือกกับเครื่องที่ถือสิทธิ์ทำงานจริง ป้ายเครื่องที่รันยังเห็นบนมือถือ กดการ์ดเดิมไม่ส่งคำสั่ง ระหว่างบันทึกปิดตัวเลือกอื่น ถ้าบอทปิดอยู่ การเปลี่ยน host จะยังคงปิดบอท การสลับเครื่องไม่เก็บเสียงและคิวใน RAM

ออกจากระบบอยู่ท้ายเมนูด้านข้าง บนมือถือเป็นไอคอนเล็กที่มีชื่อสำหรับการเข้าถึง หน้าควบคุม ตั้งค่าและ log จำกัดความกว้าง เว้นระยะและใช้สีตามธีม ส่วนการวางปฏิทินคงเดิม

Log ต้องใช้ session admin เบราว์เซอร์โหลด /bot-logs.js ซึ่ง assets.js เปิดให้โหลด แล้วขอ /api/bot/logs สาเหตุหน้าว่างเดิมคือไม่ได้เปิด route ของไฟล์นี้ ปัจจุบันตอบ JavaScript ได้แล้ว หน้า log ที่เปิดอยู่ขอข้อมูลทุกสามวินาที หยุด รีเฟรช ล้างหน้าจอได้ และเริ่มใหม่เมื่อ instance เปลี่ยน ล้างหน้าจอไม่ลบประวัติเซิร์ฟเวอร์

เก็บ log ในโปรเซสสูงสุดห้าร้อยบรรทัด บรรทัดละสองพันตัวอักษร ส่งสูงสุดสองร้อยรายการต่อคำขอ ปิดบังค่าสำคัญที่ระบบรู้จัก รีสตาร์ทแล้วประวัติใน RAM เริ่มใหม่ ใช้ tutel log ดู journald ได้ API ส่งตามเครื่องที่รันจริง

ทั้งสองเครื่องใช้ user service tutelbot.service มี tutel start stop restart status log อัปเดตเฉพาะไฟล์ของงานที่อนุญาต สำรองก่อนและไม่แทนที่ env จริง การอัป GitHub แยกจาก deploy เซิร์ฟเวอร์และทำเมื่อผู้ใช้สั่ง งานนี้ทดสอบอัตโนมัติผ่าน 43 รายการและตรวจหน้าเว็บ homeserver ว่ามีสถานะจริงและ log ไม่ว่าง
