# Daily summaries and music sources / สรุปรายวันและแหล่งเพลง

This update supersedes the per-event reminder schedules and SoundCloud defaults described in older handbook PDFs.
เอกสารนี้แทนพฤติกรรมเตือนแยกรายกิจกรรมและค่าเริ่มต้น SoundCloud ในคู่มือ PDF รุ่นก่อน

## Daily calendar summary / สรุปปฏิทินรายวัน

- One automatic summary per configured guild/channel and Thai calendar date, at `dayTime` (default 07:00 Asia/Bangkok).
- Includes all-day, timed, recurring and overlapping multi-day events, subject to the guild's category/nonholiday filters and event visibility.
- All-day events appear first, followed by timed events. Empty dates produce no new message.
- Later edits change the recorded Discord message instead of sending another message. Deleted Discord messages are not recreated automatically.
- Restarting after the configured time catches up today only. Keep one bot process per token; delivery records provide best-effort deduplication, not a transaction spanning the configured database and Discord.
- Long summaries include a UTF-8 text attachment containing the full agenda. The bot needs View Channel, Send Messages, Embed Links and, for long agendas, Attach Files.
- Calendar button opens the correct date; private link replies expire after 30 seconds. Only the latest notification keeps the calendar button.
- Legacy `beforeEnabled`, `beforeTime`, event reminder offsets and `default_reminder` are retained as stored metadata but do not create additional automatic notifications.
- `/calendar config time:07:00` changes the summary time. `/calendar test` sends an explicit preview without using the automatic daily delivery key.

ส่งสรุปกิจกรรมของวันนี้ครั้งเดียวตามเวลาที่ตั้งไว้ เริ่มต้น 07:00 น. รวมทั้งกิจกรรมทั้งวันและกิจกรรมที่มีเวลา ตามหมวดที่เลือก เมื่อแก้กิจกรรมจะปรับข้อความเดิม ไม่ส่งใหม่ ไม่มีการเตือนแยกรายกิจกรรมหรือก่อนหนึ่งวัน วันที่ไม่มีรายการไม่ส่ง ถ้ารายการยาวมากจะมีไฟล์ข้อความแนบครบทั้งหมด

## Music source / แหล่งเพลง

- Default: **YouTube**, regardless of the old `MUSIC_SEARCH_PREFIX` environment value.
- `/music settings` shows the current guild source.
- `/music settings source:youtube` or `source:soundcloud` saves the choice. Requires Manage Server permission.
- Admin control panel → bot controls → each guild's music source selector offers the same setting.
- Stored in the configured database `app_settings` as `music_source:<guild ID>`. No schema migration or new dependency is required.
- Searches in `/play` and future `/randommusic` selections use the source. Explicit links keep their own provider; existing queued tracks are unchanged.
- Audio continues to stream through yt-dlp stdout and FFmpeg without saving song files. Source availability still depends on the running server's network and provider restrictions.

ตั้ง YouTube เป็นค่าเริ่มต้น เปลี่ยนแยกแต่ละเซิร์ฟเวอร์ได้ในคำสั่งหรือหน้าแอดมิน ค่าบันทึกอยู่ในฐานข้อมูล ไม่หายเมื่อรีสตาร์ต ลิงก์ตรงใช้แหล่งของลิงก์นั้น เพลงที่อยู่ในคิวก่อนเปลี่ยนยังเล่นจากแหล่งเดิม

## Calendar list / รายการปฏิทิน

`/calendar list` starts at Thai midnight today, groups entries by date, marks all-day entries as “ทั้งวัน”, and hides generated holiday IDs. Numeric IDs remain for deleting user-created events. The first ten entries are shown with the total count.

## Rollout / การอัปเดต

Back up source and the configured database, copy updated source files, register slash commands, then restart the single running bot service. No public-calendar frontend deployment is required for this backend/admin change. Do not replace the running server's `.env` or database.

## Language, help and Loop

The latest music panel includes Loop for the current track. Skip bypasses the repeat; stop/leave/live radio disable it. Labels and built-in summary headings follow `src/config/bot.js` or the optional `BOT_LANGUAGE` override. `/help` gives the invoking user private website, guide and repository buttons. See [language configuration](BOT-LANGUAGE.md), [music controls](MUSIC-PANEL.md) and [MongoDB/failover](MONGODB-FAILOVER.md).
