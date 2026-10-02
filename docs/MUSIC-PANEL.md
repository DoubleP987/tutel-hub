# Persistent chat music panel / แผงเพลงในแชท

The panel is created automatically by `/play` and `/randommusic`. No extra slash command is needed.

## Behavior

- One active panel per guild. Playback and queue changes edit the same Discord message.
- A play request in another text channel creates the panel there and removes the old panel's buttons. Old interactions are rejected even if editing the previous message fails.
- Stopping, leaving or finishing the queue keeps the latest track visible, with a stopped status.
- Channel/message IDs and latest track metadata live in the configured SQLite/MongoDB `app_settings`, under `music_panel:<guild ID>`. Restart restores existing panels as stopped; it does not resume audio or create unsolicited replacement messages.
- If the panel is deleted, the next play/random request recreates it. Periodic updates do not continually repost deleted panels.
- Progress uses the audio resource's playback duration; the panel refreshes at fifteen-second intervals while a track is playing. Event updates are debounced and unchanged messages are not edited.

## Controls

| Control      | Action                                                                          |
| ------------ | ------------------------------------------------------------------------------- |
| Pause/resume | Toggle playback without clearing the queue                                      |
| Skip         | Advance to the next queued/random track                                         |
| Stop         | Stop audio, clear queue, disable random selection                               |
| Random       | Toggle continuous random selection; disabling keeps the current track and queue |
| Queue        | Private paginated queue, visible only to the requesting user                    |
| Add track    | Modal for a song name or link; searches with the guild's chosen source          |
| Settings     | Private YouTube/SoundCloud selector; requires Manage Server                     |
| Leave        | Stop and leave the voice channel                                                |

Playback controls require the user to be in the bot's voice channel. If the bot is not connected, starting music requires the user to be in a voice channel. Queue viewing is available to everyone. Repeated actions are throttled; stop/leave remain available while searches are pending. Voice membership, panel identity and cancellation version are checked again after track searches.

The bot requires View Channel, Send Messages, Embed Links and Read Message History in the panel channel. Requests that cannot create the panel give a private warning while music commands can continue.

## Modules

- `src/music/events.js`: playback changes and request invalidation, independent of message rendering.
- `src/music/player.js`: playback and random-mode controls.
- `src/music/panel.js`: persistent panel, serialized message updates, buttons, queue pagination, modal and settings selector.
- `src/bot/runtime.js`: registers component handling and restores/shuts down panels.

## ภาษาไทย

ใช้ `/play` หรือ `/randommusic` แล้วแผงจะขึ้นอัตโนมัติ เปลี่ยนเพลงแล้วแก้ข้อความเดิม หยุดเพลงหรือออกจากห้องแล้วข้อความยังอยู่พร้อมเพลงล่าสุด กดเพิ่มเพลงเพื่อกรอกชื่อหรือลิงก์ ดูคิวและตั้งค่าเป็นข้อความเฉพาะคนกด

ปุ่มควบคุมต้องอยู่ห้องเสียงเดียวกับบอท เปลี่ยนแหล่งเพลงต้องมีสิทธิ์จัดการเซิร์ฟเวอร์ หากเรียกเล่นจากช่องแชทใหม่ แผงจะย้ายไปช่องนั้นและปิดปุ่มของข้อความเก่า แผงเป็นข้อความปกติ จึงเลื่อนขึ้นตามบทสนทนา ไม่ใช่ส่วนที่ลอยติดหน้าจอ

เมื่อรีสตาร์ตบอท แผงเดิมยังอยู่และแสดงสถานะหยุด ต้องเริ่มเล่นใหม่เอง โค้ดเก็บตำแหน่งแผงในฐานข้อมูลเดิม ไม่ต้องตั้งฐานข้อมูลเพิ่มเติม

## Loop / วนเพลง

The Loop button repeats the current song until switched off. Skip bypasses the repeat for that song, and Stop/Leave resets Loop. Live radio does not support Loop. The setting is separate per guild and resets when playback restarts after a node switch.

ปุ่ม Loop วนเพลงปัจจุบัน กดข้ามเพื่อไปเพลงถัดไป กดหยุดหรือออกจากห้องเพื่อปิด Loop วิทยุสดไม่ใช้ Loop แยกสถานะแต่ละเซิร์ฟเวอร์ และไม่เก็บสถานะข้ามการรีสตาร์ต/สลับเครื่อง

## Language and help / ภาษาและคู่มือ

`src/config/bot.js` and `BOT_LANGUAGE` select Thai/English control labels and messages. Thai is the default. `/help` privately displays website/guide buttons. See [English](BOT-LANGUAGE.md) / [ภาษาไทย](BOT-LANGUAGE.th.md).
