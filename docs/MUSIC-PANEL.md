# Persistent chat music panel / แผงเพลงในแชท

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

/join joins voice and displays the existing shared player without starting audio. Five idle minutes with no queue, song, random playback or radio triggers leave. A new play request edits the same message even if requested from another text channel; leaving removes it. Restart does not restore audio or the in-memory queue.

The Random button always opens a private genre selector. Its 25 choices include mixed music and Japanese music. Selecting a genre while random playback is active keeps the current song playing, discards unsuitable preloaded random audio, and uses the new genre for subsequent random songs. User-queued songs still have priority. Disable random is inside this private menu.

The single Radio button opens a private station selector while in music mode. Select a station to validate it and prepare audio before replacing the music. The old queue and random preference are retained. Press the same Radio button while radio is active to return to music. An interrupted song restarts from its beginning; the queue is not a seekable recording. There is no separate Return to music button.

Private interactive messages have a hard three-minute lifetime from creation; navigation does not extend it. Expired visible buttons are rejected and ask the user to reopen the menu. Text-only music/radio confirmations expire fifteen seconds after work finishes. The public music panel has no three-minute timer. Discord modals cannot be remotely closed by the bot. Graceful shutdown cleans private replies; a crash cannot guarantee timely message deletion.

Loop defaults to Queue and is stored per guild in music_loop:<guildId>. Settings offers Off, Song and Queue; the main Loop button also cycles them. Stop clears playback and random mode but retains the Loop preference. Queue-loop Skip moves the skipped song to the tail; song-loop Skip bypasses the repeat. Random mode does not recycle the queue indefinitely. Live radio has no Loop.

/join เข้าห้องเสียงและแสดงแผงเดิมโดยไม่เริ่มเล่นอะไร ว่างครบ 5 นาทีโดยไม่มีคิว เพลง สุ่มหรือวิทยุจะออกเอง การสั่งเล่นใหม่แก้ข้อความเดิมแม้เรียกจากคนละช่องแชท ไม่ส่งแผงใหม่ซ้ำ ออกจากห้องแล้วลบแผง รีสตาร์ตไม่กู้คืนเสียงและคิวใน RAM

ปุ่มสุ่มเปิดเมนูแนวเพลงเฉพาะคนกดเสมอ มี 25 ตัวเลือกรวมคละแนวและเพลงญี่ปุ่น เปลี่ยนแนวตอนเปิดสุ่มได้ เพลงปัจจุบันเล่นต่อ ยกเลิกเพลงสุ่มที่เตรียมไว้แล้วไม่ตรงแนวใหม่ และสุ่มเพลงถัด ๆ ไปตามแนวใหม่ เพลงที่ผู้ใช้เพิ่มไว้ในคิวยังมีสิทธิ์เล่นก่อน ปุ่มปิดสุ่มอยู่ในเมนูส่วนตัวนี้

เหลือปุ่มวิทยุปุ่มเดียว กดตอนฟังเพลงเพื่อเลือกสถานี ตรวจสถานีและเตรียมเสียงก่อนแทนเพลง เก็บคิวเพลงและความชอบโหมดสุ่มไว้ กดปุ่มวิทยุอีกครั้งขณะวิทยุทำงานจะกลับไปเล่นเพลง เพลงที่ถูกพักเริ่มใหม่จากต้นเพลง ไม่ได้จำตำแหน่งเสียง ไม่มีปุ่มกลับไปเพลงแยกอีกแล้ว

เมนูส่วนตัวที่มีปุ่มหมดอายุสูงสุด 3 นาทีจากเปิด ไม่ต่อเวลาเมื่อเลื่อนหน้า ถ้าข้อความยังมองเห็นหลังหมดอายุ จะปฏิเสธปุ่มและให้เปิดเมนูใหม่ คำยืนยันเพลงและวิทยุสั้น ๆ หายหลังงานเสร็จ 15 วินาที แผงเพลงหลักไม่จับเวลา 3 นาที บอทปิดฟอร์ม modal ของ Discord แทนผู้ใช้ไม่ได้ การปิดปกติล้างข้อความส่วนตัว แต่เมื่อโปรเซส crash ไม่รับประกันว่าจะลบทันเวลา

Loop เริ่มต้นเป็นวนคิวและบันทึกแยกเซิร์ฟเวอร์ใน music_loop:<guildId> ตั้งค่ามีปิด วนเพลงและวนคิว ปุ่ม Loop หลักกดวนสามค่าได้ หยุดเพลงล้างคิวและปิดสุ่มแต่จำค่า Loop กดข้ามในโหมดวนคิวนำเพลงไปท้ายคิว ส่วนวนเพลงจะข้ามการเล่นซ้ำ โหมดสุ่มไม่หมุนคิวเดิมซ้ำตลอด วิทยุสดไม่ใช้ Loop

## Code map

- `src/music/panel.js`: shared message, private menus and buttons.
- `src/music/genre-menu.js`: genre dropdown and private disable button.
- `src/music/radio-panel.js`: station picker.
- `src/music/player.js`: playback, standby, suspension and return.
- `src/bot/private-replies.js`: reply replacement and expiration.

[Metadata and constraints](MUSIC-CONTROLS.md) · [Language](BOT-LANGUAGE.md)
