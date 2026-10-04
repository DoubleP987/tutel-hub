# Current operation / การทำงานปัจจุบัน

Updated 4 October 2026. This reference supersedes conflicting baseline handbook descriptions; the same sections appear in the current-operation PDF supplement.

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

/join joins voice and displays the existing shared player without starting audio. Five idle minutes with no queue, song, random playback or radio triggers leave. A new play request edits the same message even if requested from another text channel; leaving removes it. Restart does not restore audio or the in-memory queue.

The Random button always opens a private genre selector. Its 25 choices include mixed music and Japanese music. Selecting a genre while random playback is active keeps the current song playing, discards unsuitable preloaded random audio, and uses the new genre for subsequent random songs. User-queued songs still have priority. Disable random is inside this private menu.

The single Radio button opens a private station selector while in music mode. Select a station to validate it and prepare audio before replacing the music. The old queue and random preference are retained. Press the same Radio button while radio is active to return to music. An interrupted song restarts from its beginning; the queue is not a seekable recording. There is no separate Return to music button.

Radio list has ten station choices per page, region/type filters, search, page navigation, a refresh check and the last station. The player radio selector uses at most twenty choices per page. Only the opener can use the private selector, and playback requires the same voice channel as the bot. Station health is measured from decoded samples, not just HTTP status. A one-second silent sample may mean a quiet interval rather than an offline station.

Private interactive messages have a hard three-minute lifetime from creation; navigation does not extend it. Expired visible buttons are rejected and ask the user to reopen the menu. Text-only music/radio confirmations expire fifteen seconds after work finishes. The public music panel has no three-minute timer. Discord modals cannot be remotely closed by the bot. Graceful shutdown cleans private replies; a crash cannot guarantee timely message deletion.

Loop defaults to Queue and is stored per guild in music_loop:<guildId>. Settings offers Off, Song and Queue; the main Loop button also cycles them. Stop clears playback and random mode but retains the Loop preference. Queue-loop Skip moves the skipped song to the tail; song-loop Skip bypasses the repeat. Random mode does not recycle the queue indefinitely. Live radio has no Loop.

Unknown YouTube duration originated in the fast direct-link oEmbed path, which supplied title and image but left duration at zero. Missing durations are now hydrated for the selected track with yt-dlp full metadata. Known durations and live streams avoid this lookup. Playlist entries with unknown duration are hydrated only when selected for playback or preparation, never all at once. Lookup has a six-second deadline, a five-minute positive cache and a 128-entry bound. Failure retains playback with an honest unknown duration; cancellation still prevents playback.

The reproduced Jeff Satur Ghost link qguo-j5PxBE returned zero from the old direct path, 250 seconds from full metadata, and approximately 251 seconds from flat search. The current full metadata result is 4:10. Provider search and full extraction may differ slightly; the UI must not guess duration from downloaded byte size or elapsed playback.

homeserver and Oracle use Smooth transition by default when the guild has no saved choice; saved 0 remains disabled. The repository fallback remains off for new standalone installations. Smooth/full compressed preloading is eligible only for tracks with a known finite duration above zero and at most 600 seconds. Longer, live and still-unknown tracks use ordinary streaming. Only one successor is prepared, with a 32 MiB compressed cache cap and 350 ms crossfade. Resource preparation and network problems can still cause waiting.

The bot-profile Commands showcase is controlled by Discord. /join is a normal global slash command; the supported application-command API does not expose a setting that pins only /join to this showcase. No other working commands are deleted to influence the profile. This remains a platform limitation, not a completed profile customization.

/join เข้าห้องเสียงและแสดงแผงเดิมโดยไม่เริ่มเล่นอะไร ว่างครบ 5 นาทีโดยไม่มีคิว เพลง สุ่มหรือวิทยุจะออกเอง การสั่งเล่นใหม่แก้ข้อความเดิมแม้เรียกจากคนละช่องแชท ไม่ส่งแผงใหม่ซ้ำ ออกจากห้องแล้วลบแผง รีสตาร์ตไม่กู้คืนเสียงและคิวใน RAM

ปุ่มสุ่มเปิดเมนูแนวเพลงเฉพาะคนกดเสมอ มี 25 ตัวเลือกรวมคละแนวและเพลงญี่ปุ่น เปลี่ยนแนวตอนเปิดสุ่มได้ เพลงปัจจุบันเล่นต่อ ยกเลิกเพลงสุ่มที่เตรียมไว้แล้วไม่ตรงแนวใหม่ และสุ่มเพลงถัด ๆ ไปตามแนวใหม่ เพลงที่ผู้ใช้เพิ่มไว้ในคิวยังมีสิทธิ์เล่นก่อน ปุ่มปิดสุ่มอยู่ในเมนูส่วนตัวนี้

เหลือปุ่มวิทยุปุ่มเดียว กดตอนฟังเพลงเพื่อเลือกสถานี ตรวจสถานีและเตรียมเสียงก่อนแทนเพลง เก็บคิวเพลงและความชอบโหมดสุ่มไว้ กดปุ่มวิทยุอีกครั้งขณะวิทยุทำงานจะกลับไปเล่นเพลง เพลงที่ถูกพักเริ่มใหม่จากต้นเพลง ไม่ได้จำตำแหน่งเสียง ไม่มีปุ่มกลับไปเพลงแยกอีกแล้ว

radio list เลือกเล่นได้ 10 สถานีต่อหน้า กรองพื้นที่และประเภท ค้นหา เลื่อนหน้า ตรวจสถานะใหม่ และเปิดสถานีล่าสุดได้ ตัวเลือกวิทยุจากแผงใช้ไม่เกิน 20 สถานีต่อหน้า ใช้ได้เฉพาะคนเปิดและต้องอยู่ห้องเสียงเดียวกับบอท สถานะมีเสียงตรวจจากการถอดเสียงจริง ไม่ได้ดูเพียง HTTP การตรวจหนึ่งวินาทีที่เงียบอาจเป็นช่วงเงียบ ไม่ได้ยืนยันว่าสถานีปิด

เมนูส่วนตัวที่มีปุ่มหมดอายุสูงสุด 3 นาทีจากเปิด ไม่ต่อเวลาเมื่อเลื่อนหน้า ถ้าข้อความยังมองเห็นหลังหมดอายุ จะปฏิเสธปุ่มและให้เปิดเมนูใหม่ คำยืนยันเพลงและวิทยุสั้น ๆ หายหลังงานเสร็จ 15 วินาที แผงเพลงหลักไม่จับเวลา 3 นาที บอทปิดฟอร์ม modal ของ Discord แทนผู้ใช้ไม่ได้ การปิดปกติล้างข้อความส่วนตัว แต่เมื่อโปรเซส crash ไม่รับประกันว่าจะลบทันเวลา

Loop เริ่มต้นเป็นวนคิวและบันทึกแยกเซิร์ฟเวอร์ใน music_loop:<guildId> ตั้งค่ามีปิด วนเพลงและวนคิว ปุ่ม Loop หลักกดวนสามค่าได้ หยุดเพลงล้างคิวและปิดสุ่มแต่จำค่า Loop กดข้ามในโหมดวนคิวนำเพลงไปท้ายคิว ส่วนวนเพลงจะข้ามการเล่นซ้ำ โหมดสุ่มไม่หมุนคิวเดิมซ้ำตลอด วิทยุสดไม่ใช้ Loop

สาเหตุความยาว YouTube หายคือทางลิงก์ตรงใช้ oEmbed แบบเร็ว ได้ชื่อและรูปแต่เก็บ duration เป็นศูนย์ ตอนนี้ดึง metadata เต็มของเพลงที่เลือกด้วย yt-dlp เมื่อความยาวหาย เพลงที่รู้เวลาและสตรีมสดไม่ทำงานเพิ่ม รายการใน Playlist ที่ยังไม่รู้เวลาจะดึงเฉพาะตอนกำลังจะเล่นหรือเตรียม ไม่ดึงครบทุกเพลงล่วงหน้า จำกัดการค้นข้อมูล 6 วินาที cache สำเร็จ 5 นาทีและไม่เกิน 128 รายการ ถ้าดึงไม่ได้ยังเล่นได้โดยแสดงไม่ทราบความยาวตามจริง ยกเลิกคำขอแล้วไม่เริ่มเพลง

ทดสอบลิงก์ Jeff Satur Ghost รหัส qguo-j5PxBE ทางเดิมได้ศูนย์ ข้อมูลเต็มได้ 250 วินาทีหรือ 4:10 ส่วนค้นชื่อแบบ flat ได้ประมาณ 251 วินาที เวลาในผลค้นและข้อมูลเต็มอาจต่างกันเล็กน้อย ไม่ควรเดาเวลาจากจำนวน bytes ที่ดาวน์โหลดหรือเวลาเล่นที่ผ่านไป

บน homeserver และ Oracle เปิด Smooth transition เป็นค่าเริ่มต้นถ้าเซิร์ฟเวอร์ยังไม่มีค่าบันทึก ค่า 0 ที่เคยปิดยังปิดเหมือนเดิม ส่วนโค้ดใน repo ใช้ค่าเริ่มต้นปิดสำหรับการติดตั้งใหม่ โหมด Smooth และการเตรียมเสียงเต็มใน RAM ใช้เฉพาะเพลงที่รู้เวลามากกว่าศูนย์และไม่เกิน 600 วินาที คลิปยาว สตรีมสดและรายการที่ยังไม่รู้เวลาเล่นแบบสตรีมปกติ เตรียมเพลงถัดไปหนึ่งเพลง จำกัดเสียงบีบอัด 32 MiB และซ้อนเสียง 350 ms แหล่งเพลงหรือเครือข่ายช้ายังทำให้รอได้

ส่วน Commands ในโปรไฟล์บอท Discord เป็นพื้นที่ที่ Discord จัดแสดง /join เป็น slash command แบบ global ตามปกติ API ที่รองรับไม่มีค่าที่สั่งปักเฉพาะ /join ในส่วนนี้ ไม่ลบคำสั่งอื่นที่ใช้งานอยู่เพื่อบังคับหน้าตา จึงยังเป็นข้อจำกัดของแพลตฟอร์ม ไม่ใช่ฟีเจอร์โปรไฟล์ที่ทำเสร็จแล้ว

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

Both servers use the user service tutelbot.service. The tutel shortcuts offer start, stop, restart, status and log. Deploy only the files required for an approved task, keep backups and preserve real environment files. GitHub pushes are separate from server deployment and require the user instruction. This update passed 45 automated tests and verified live control status and nonempty logs in the homeserver browser.

หน้าควบคุมแสดงแต่ละดิส ชื่อเพลงหรือสถานี ห้องเสียง จำนวนคิวและโหมดสุ่ม แยกสถานะไม่ได้เข้าห้อง รอ โหลด เพลง วิทยุ และพัก หน้า admin ที่เปิดอยู่รีเฟรชทุกห้าวินาที หยุดเมื่อแท็บอยู่เบื้องหลังหรือโฟกัสฟอร์มเพลง เพื่อไม่แย่งการแก้ค่าและไม่ทำงานเกินจำเป็น

การ์ด host แยกโหมดที่เลือกกับเครื่องที่ถือสิทธิ์ทำงานจริง ป้ายเครื่องที่รันยังเห็นบนมือถือ กดการ์ดเดิมไม่ส่งคำสั่ง ระหว่างบันทึกปิดตัวเลือกอื่น ถ้าบอทปิดอยู่ การเปลี่ยน host จะยังคงปิดบอท การสลับเครื่องไม่เก็บเสียงและคิวใน RAM

ออกจากระบบอยู่ท้ายเมนูด้านข้าง บนมือถือเป็นไอคอนเล็กที่มีชื่อสำหรับการเข้าถึง หน้าควบคุม ตั้งค่าและ log จำกัดความกว้าง เว้นระยะและใช้สีตามธีม ส่วนการวางปฏิทินคงเดิม

Log ต้องใช้ session admin เบราว์เซอร์โหลด /bot-logs.js ซึ่ง assets.js เปิดให้โหลด แล้วขอ /api/bot/logs สาเหตุหน้าว่างเดิมคือไม่ได้เปิด route ของไฟล์นี้ ปัจจุบันตอบ JavaScript ได้แล้ว หน้า log ที่เปิดอยู่ขอข้อมูลทุกสามวินาที หยุด รีเฟรช ล้างหน้าจอได้ และเริ่มใหม่เมื่อ instance เปลี่ยน ล้างหน้าจอไม่ลบประวัติเซิร์ฟเวอร์

เก็บ log ในโปรเซสสูงสุดห้าร้อยบรรทัด บรรทัดละสองพันตัวอักษร ส่งสูงสุดสองร้อยรายการต่อคำขอ ปิดบังค่าสำคัญที่ระบบรู้จัก รีสตาร์ทแล้วประวัติใน RAM เริ่มใหม่ ใช้ tutel log ดู journald ได้ API ส่งตามเครื่องที่รันจริง

ทั้งสองเครื่องใช้ user service tutelbot.service มี tutel start stop restart status log อัปเดตเฉพาะไฟล์ของงานที่อนุญาต สำรองก่อนและไม่แทนที่ env จริง การอัป GitHub แยกจาก deploy เซิร์ฟเวอร์และทำเมื่อผู้ใช้สั่ง งานนี้ทดสอบอัตโนมัติผ่าน 45 รายการและตรวจหน้าเว็บ homeserver ว่ามีสถานะจริงและ log ไม่ว่าง

## Smooth transitions: continuous audio and RAM preparation / เปลี่ยนเพลงต่อเนื่องและเตรียมเสียงใน RAM

The private music-panel settings have separate Enable and Disable buttons. Manage Server and voice checks apply. Repository fallback off; live homeserver/Oracle fallback on; stored per guild as music_smooth:<guildId>. The preference persists, but queues and audio do not survive restart or failover. Live radio is unchanged.

As a song starts, player.js chooses one successor from queue, loop or random discovery. stream.js downloads complete compressed audio into RAM, then FFmpeg prepares bounded 48 kHz stereo PCM. No media file is saved; network bandwidth is still consumed.

continuous-pcm.js keeps one PCM stream, one Opus encoder and one Discord AudioResource. It mixes old and new audio for 350 ms with opposing linear gains at natural endings and Skip. After handoff, preparation of the next successor starts. The overlap shortens total duration slightly.

The RAM cache is capped at 32 MiB per song; concatenation can briefly double its memory cost. Over-limit songs fall back to bounded streaming. Preparation timeout is 90 seconds and decoder readiness timeout is 25 seconds. One successor per guild means simultaneous guilds multiply memory and process costs.

If Skip occurs before preparation is ready, the old song keeps playing. A natural ending may still wait for a slow source. Enabling during playback migrates the decoder once and may briefly interrupt it. Leading quiet audio and retained digital tail silence are trimmed, not intentional pauses throughout a recording.

Stop, Leave, radio and stale preparation cancel work. Inspect fully cached, bounded stream and continuous transition logs. Synthetic natural-end and Skip checks found no silent PCM/Opus test frames and no player resource replacement between songs. A real YouTube item decoded nonzero samples on homeserver; this is not proof of listener delivery under every network condition.

Text-only music/radio acknowledgments and errors auto-dismiss 15 seconds after handler completion. Deferred progress remains during work and interactive menus keep their normal lifetime. The public player is unaffected. The promotional site now presents music, radio and smooth transitions; the personal calendar remains a separate application concern sharing this runtime.

Only known, finite tracks up to ten minutes use full successor preparation. A saved guild disable choice is respected on the two live hosts.

เปิดตั้งค่าในแผงเพลง Discord เพื่อกดเปิดหรือปิดโหมดแยกแต่ละเซิร์ฟเวอร์ ข้อความเห็นเฉพาะผู้กด ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์และผ่านการตรวจห้องเสียง บน homeserver และ Oracle ค่าเริ่มต้นเปิด ส่วน repo สำหรับติดตั้งใหม่ค่าเริ่มต้นปิด เก็บค่า music_smooth:<guildId> ในฐานข้อมูล ค่านี้คงอยู่แต่คิวและเสียงไม่กลับมาเล่นต่อหลังรีสตาร์ตหรือสลับเครื่อง ไม่เปลี่ยนระบบวิทยุ

เมื่อเพลงเริ่ม player.js เลือกเพลงถัดไปหนึ่งเพลงจากคิว การวน หรือสุ่ม stream.js ดึงเสียงบีบอัดครบมาไว้ใน RAM แล้ว FFmpeg เตรียม PCM สเตอริโอ 48 kHz แบบจำกัดบัฟเฟอร์ ไม่บันทึกไฟล์ลงดิสก์ แต่ยังใช้เน็ตจริง

continuous-pcm.js ใช้สตรีมเสียง ตัวเข้ารหัส Opus และตัวเล่น Discord เดียวต่อเนื่อง ซ้อนเสียง 350 มิลลิวินาทีโดยลดเพลงเก่าและเพิ่มเพลงใหม่พร้อมกัน ทั้งตอนจบเองและกดข้าม หลังเปลี่ยนจะเตรียมเพลงต่อไป เวลารวมลดลงเล็กน้อยเพราะเพลงซ้อนกัน

จำกัดเสียงบีบอัด 32 MiB ต่อเพลง ขณะรวม Buffer อาจใช้ RAM ประมาณสองเท่าชั่วคราว เพลงเกินขนาดใช้สตรีมจำกัดบัฟเฟอร์แทน โหลดมี timeout 90 วินาที และรอ decoder พร้อม 25 วินาที เตรียมหนึ่งเพลงต่อเซิร์ฟเวอร์ ถ้าเล่นหลายเซิร์ฟเวอร์พร้อมกันย่อมใช้ RAM และโปรเซสเพิ่ม

กดข้ามก่อนเพลงถัดไปพร้อมจะให้เพลงเดิมเล่นรอ หากจบเองแต่แหล่งเพลงช้ายังรอได้ เปิดโหมดระหว่างเพลงมีการย้าย decoder หนึ่งครั้งอาจสะดุดสั้น ๆ ตัดเงียบเฉพาะต้นเสียงและท้ายที่กันไว้ ไม่ตัดช่วงพักกลางเพลงทั้งหมด

หยุด ออกจากห้อง เปิดวิทยุ หรือเพลงที่เตรียมไว้ไม่ตรงจะยกเลิกงาน ดู log fully cached, bounded stream และ continuous transition การทดสอบจำลองทั้งจบเองและกดข้ามไม่พบเฟรมเงียบ PCM/Opus หรือเปลี่ยนตัวเล่นระหว่างเพลง ลิงก์ YouTube จริงถอดได้เสียงที่ไม่เป็นศูนย์บน homeserver แต่ไม่ใช่การรับรองว่าเสียงถึงผู้ฟังครบในทุกสภาพเครือข่าย

คำยืนยันและข้อผิดพลาดข้อความเพลง/วิทยุหายเอง 15 วินาทีหลังคำสั่งเสร็จ ระหว่างโหลดไม่เริ่มนับ เมนูที่มีปุ่มยังอยู่ให้ใช้ แผงเพลงสาธารณะไม่หายตามนี้ เว็บโปรโมทนำเสนอเพลง วิทยุ และ Smooth transition ส่วนปฏิทินเป็นแอปส่วนตัวที่ใช้ระบบร่วมกันและยังทำงานตามเดิม

การเตรียมเพลงถัดไปเต็มใช้กับเพลงที่รู้เวลาจำกัดและยาวไม่เกินสิบนาที การตั้งค่าปิดที่บันทึกแยกเซิร์ฟเวอร์ยังคงมีผลทั้งสองเครื่อง

## Detailed guides / คู่มือเฉพาะส่วน

- [Music controls](MUSIC-CONTROLS.md)
- [Smooth transition](SMOOTH-TRANSITION.md)
- [Radio and panel](RADIO-AND-PANEL.md)
