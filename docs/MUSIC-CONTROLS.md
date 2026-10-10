# Music controls and metadata / เมนูเพลงและข้อมูลความยาว

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

Updated 4 October 2026 / อัปเดต 4 ตุลาคม 2569

## English

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

## ภาษาไทย

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
