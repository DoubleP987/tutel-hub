# Playlists, queue controls and random genres

[ภาษาไทย](#ภาษาไทย) · Updated 3 October 2026

## English

`/play query:<URL or song name>` now accepts a public YouTube playlist or SoundCloud set. A YouTube URL containing both a video and `list=` displays private **Single track / Entire playlist / Cancel** buttons. Choose within 45 seconds. A pure playlist link imports directly. The music panel's Add button uses the same importer.

The bot reads lightweight entry metadata, in original order, without downloading media files. It imports at most **100 entries per request**, with **500 waiting tracks per guild**. Progress reports how many entries have been read; the batch is queued only after reading completes. Cancel, Stop, Leave, a replaced request, or leaving/changing your voice channel prevents an unfinished batch from being committed. Starting another play request in the same guild cancels the previous unfinished import. Existing queued tracks remain.

Private/deleted entries detected during extraction are omitted. A partial successful extraction can queue its readable entries and reports that it was partial. A request exceeding 45 seconds is cancelled. Media that fails when playback begins is skipped by the player; failed/empty streams are not recycled by Loop. These safeguards cannot guarantee upstream availability or audible content for every URL.

| Command                              | Usage                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `/playnext query:<song or playlist>` | Insert immediately after the current track; imported playlist order is preserved |
| `/queue`                             | Inspect the numbered waiting queue                                               |
| `/remove position:2`                 | Remove the second waiting track                                                  |
| `/move position:5 to:1`              | Move the fifth waiting track to the front                                        |
| `/clearqueue`                        | Clear waiting tracks; keep the current track playing                             |
| `/shuffle`                           | Shuffle waiting tracks; leave the current track alone                            |
| `/loop mode:off/track/queue`         | Disable repeat, repeat one track, or repeat the queue                            |
| `/randommusic genre:<choice>`        | Enable continuous random music with an optional genre                            |

Queue edits require being in the bot's voice channel. The Loop button cycles **Off → Track → Queue → Off**. Skip bypasses repeat for the skipped track; Stop resets repeat and clears the queue. Queued songs take priority over random search.

### Random genres

Genre is optional, with 26 searchable suggestions: Mixed, Thai, Pop, Rock, Hip-hop/Rap, R&B/Soul, Jazz, Lo-fi/Chill, Electronic/EDM, Heavy bass/Bass Boosted, Luk thung/Mor lam, Acoustic, Anime/Anisong, Russian, K-pop, Japanese (including J-pop/J-rock/City Pop), Metal, Classical, Instrumental, Ambient/Relaxing, Reggae/Ska, Latin, Chinese/C-pop, Indie/Alternative, Pop Ballad/Love songs, Meme/Internet. Discord displays up to 25 suggestions at once; type a genre name to find any category. Heavy bass mixes Dubstep, Trap, Phonk, Drum & Bass and Hardstyle searches; it does not increase playback gain. Genre matching relies on provider search results.

The last chosen genre is stored per guild in the shared datastore. Omit `genre` to reuse it; a fresh guild defaults to Mixed. Switching genre takes effect for subsequent random tracks, preserving the current song and manually queued songs. The panel's random toggle uses the remembered genre. The server's configured music provider still applies; an Oracle SoundCloud override remains respected.

Only the selected style is queried during playback. A bounded cache holds up to 20 searches per active random session, so more menu choices do not start more workers or download songs in advance. Each genre uses several search phrases and recent-history filtering. This is a search heuristic: labels/genre accuracy, artist diversity and source availability are not guaranteed. Normal random tracks are 90–600 seconds; Meme permits 30–600 seconds. Compilations, longplay and live streams remain excluded.

### Faster direct YouTube links

Recognized YouTube video URLs use a small oEmbed request for title/artist, with a four-second timeout and bounded five-minute cache. Full media extraction occurs only when that track starts. If metadata fails, playback can still try the selected video with a fallback title. Duration may initially be unknown. Named search remains a separate path. Playlist enumeration uses yt-dlp's flat extraction; see the [official options](https://github.com/yt-dlp/yt-dlp#usage-and-options).

### Empty voice channels and deployment

If no human remains in voice, the bot leaves after 120 seconds. Returning before the timer expires cancels it. Set `VOICE_EMPTY_LEAVE_SECONDS=0` to disable, or configure 1–3600 seconds, then restart.

After installing the updated source, run `npm run register` once to update **global** commands, then restart the bot service. Do not also register the same commands in a guild unless deliberately maintaining a test scope. No dependency or database-schema migration is required. Queues and active audio remain in RAM, so a restart/failover does not preserve them.

## ภาษาไทย

- `/play` รับลิงก์ YouTube playlist และ SoundCloud set ได้แล้ว ถ้าลิงก์มีทั้งเพลงและ playlist จะมีปุ่มให้เลือกเฉพาะเพลงหรือทั้งรายการ ภายใน 45 วินาที
- อ่านรายชื่อแบบเบา ๆ สูงสุด 100 รายการต่อครั้ง ไม่เก็บไฟล์เพลงลงเครื่อง แสดงความคืบหน้าและมีปุ่มยกเลิก เพิ่มลงคิวเป็นชุดหลังอ่านเสร็จ จึงยกเลิกระหว่างอ่านได้โดยไม่เหลือคิวครึ่งชุด
- คิวรอสูงสุด 500 เพลงต่อเซิร์ฟเวอร์ รายการส่วนตัว/ถูกลบที่ตรวจพบจะถูกข้าม เพลงที่เปิดเสียงไม่ได้จะข้ามตอนเล่น และไม่ใส่กลับเข้า Loop
- `/playnext` แทรกต่อจากเพลงปัจจุบัน, `/remove` ลบตามเลขจาก `/queue`, `/move` ย้ายตำแหน่ง, `/clearqueue` ล้างเฉพาะเพลงที่รอ, `/shuffle` สุ่มลำดับเพลงที่รอ ต้องอยู่ห้องเสียงเดียวกับบอท
- `/loop mode:` เลือกปิด / เพลงเดียว / ทั้งคิว ปุ่มบนแผงหมุนสามโหมดเหมือนกัน กดข้ามยังข้ามได้ และ `/stop` ปิด Loop
- `/randommusic genre:` เป็นตัวเลือก **ไม่บังคับ** มี 26 แนว ค้นหาจากรายการแนะนำได้ รวมเพลงญี่ปุ่น รัสเซีย อนิเมะ ฮิปฮอป เพลงมีม และเบสหนัก พิมพ์ `เบส` หรือ `bass` แล้วเลือก **เบสหนัก / Bass Boosted** เพื่อคละ Dubstep, Trap, Phonk, Drum & Bass และ Hardstyle ระบบค้นหาเพลงตามแนว ไม่ได้เพิ่ม gain ของเสียง Discord แสดงได้ครั้งละ 25 ตัวเลือก จึงพิมพ์ชื่อเพื่อหาแนวที่ต้องการได้ ไม่เลือกจะใช้แนวล่าสุดของเซิร์ฟเวอร์นั้น เซิร์ฟเวอร์ใหม่เริ่มคละแนว
- การเปลี่ยนแนวมีผลกับเพลงสุ่มถัดไป ไม่ตัดเพลงที่เล่นอยู่ และไม่ลบเพลงที่ผู้ใช้เพิ่มเอง ตัวเลือกเพิ่มไม่เปิดโปรเซสเพิ่มล่วงหน้า
- สุ่มเพลงปกติ 90–600 วินาที แนวมีม 30–600 วินาที ไม่เอา longplay/เพลงรวม/ถ่ายทอดสด การค้นหาตามแนวเป็น heuristic จึงอาจไม่ได้แนวตรงทุกเพลง และขึ้นกับเพลงที่แหล่งต้นทางเปิดให้เล่น
- ลิงก์เพลง YouTube ตรงไม่ค้นข้อมูลเต็มซ้ำก่อนเล่นแล้ว ใช้ข้อมูลชื่อแบบเบา ๆ ก่อนเปิดสตรีมจริง ความยาวอาจยังไม่ทราบ
- ห้องเสียงไม่มีคนจะออกหลัง 120 วินาที ตั้ง `VOICE_EMPTY_LEAVE_SECONDS=0` เพื่อปิด หรือกำหนดเวลาเองได้ถึง 3600 วินาที
- การรีสตาร์ตหรือสลับเครื่องยังทำให้คิวใน RAM หาย ไม่ใช่คิวถาวร ไม่ต้องย้าย schema ฐานข้อมูลหรือติดตั้ง dependency เพิ่ม แต่ต้อง register คำสั่งใหม่หนึ่งครั้ง
