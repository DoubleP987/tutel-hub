# Continuous random music / สุ่มเพลงต่อเนื่อง

`/randommusic` uses the guild's selected YouTube/SoundCloud source and continues until `/stop` or `/leave`.

## Selection

- Shuffled search groups mix Thai pop, rock, country/molam, indie, classics, hip hop and international pop/rock/R&B/hip hop.
- Search terms request music videos/audio, not one artist's playlist. This is discovery from search results, not an official real-time chart feed.
- Only tracks with a known duration of 90–600 seconds qualify. Live/upcoming videos and titles describing compilations, full albums, playlists or longplays are rejected.
- The latest 80 selected URLs are excluded. Recent five artist/channel identifiers and recent two search styles are avoided when choosing the next result. Provider metadata cannot guarantee perfect artist classification.
- Each search group caches lightweight metadata for ten minutes in memory; stopping clears the guild's selection session. No audio file is saved.

## Playback and recovery

- Search uses yt-dlp `--flat-playlist`, extracting audio only for the selected URL. This avoids fully resolving twelve videos and overflowing the old metadata buffer.
- Searches have timeouts, size bounds and cancellation. Stop/leave/radio invalidates pending work so it cannot start music later.
- Playback errors and startup stalls advance to another song. Search failures retry with a bounded delay.
- User-added queue entries take priority. Random selection resumes after the queue empties.
- `/randommusic` acknowledges immediately, then reports whether the audio player actually reached its playing state or is still trying another selection.
- yt-dlp is explicitly given the running Node.js executable for supported YouTube JavaScript challenges. See [yt-dlp runtime setup](https://github.com/yt-dlp/yt-dlp/wiki/EJS) and [yt-dlp options](https://github.com/yt-dlp/yt-dlp#usage-and-options).

## ภาษาไทย

ใช้ `/randommusic` ในห้องเสียง บอทจะคละเพลงไทยและสากลหลายแนว เลือกเพลงเดี่ยว 1.5–10 นาที ไม่เลือกคลิปรวมเพลงหรืออัลบั้มยาว หลีกเลี่ยงรายการและศิลปิน/ช่องที่เพิ่งเล่น เพลงที่ผู้ใช้เพิ่มเข้าคิวมาก่อนจะได้เล่นก่อน แล้วกลับไปสุ่มต่อ

โค้ดเก่าดึงข้อมูลเต็มของผลค้นหาหลายเพลงและมีเพดานข้อมูลต่ำ ทำให้โปรเซสจบโดยไม่มีผลลัพธ์ โค้ดใหม่อ่านเฉพาะข้อมูลรายการก่อน แล้วสตรีมเสียงของเพลงที่เลือกทีละเพลง หากค้นหาไม่สำเร็จหรือเพลงเริ่มเล่นไม่ได้จะเปลี่ยนรายการอัตโนมัติ

ความนิยมอิงผลค้นหา ไม่ใช่ข้อมูลอันดับชาร์ตสด และชื่อ/ศิลปินอาจไม่ครบตามข้อมูลที่ผู้ให้บริการส่งมา การเล่นเสียงจริงยังขึ้นกับการเข้าถึงแหล่งเพลงและสิทธิ์ห้องเสียงของบอท

## Current operation update / อัปเดตการทำงาน

[Current operation, 4 October 2026 / การทำงานปัจจุบัน](CURRENT-OPERATIONS.md) documents the single random-genre selector, private music/radio replies, per-guild playback status, host cards, sidebar logout and working log route.
