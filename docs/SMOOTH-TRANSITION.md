# Smooth music transitions / การเปลี่ยนเพลงแบบต่อเนื่อง

## Group integration update — 10 October 2026

Calendar web/groups/invitations/mobile sidebar/shared dates are deployed on homeserver. Discord worker and private panel cutover remain pending; legacy reminders still run. Read [current Calendar status](https://github.com/DoubleP987/tutel-calendar/blob/main/docs/CURRENT-STATUS.md).

> Calendar source is deployed independently; bot worker cutover remains pending. Current status is documented in the Calendar repository.

Updated 4 October 2026. This applies to music playback; live radio keeps its existing streaming pipeline.

## Enable it

Open Settings on the Discord music panel, then press Enable smooth transition. The settings message is private and can be dismissed. Press Disable to return to ordinary playback. Changing the setting requires Manage Server and the existing voice-channel checks.

The repository fallback is **off**; homeserver and Oracle use an **on** fallback unless a guild has explicitly saved disabled. Each guild stores its own choice in `app_settings` as `music_smooth:<guildId>`, with `1` for enabled and `0` for disabled. SQLite and MongoDB use the same setting. Persisting this preference does not persist the playback queue or audio after a restart/failover.

## Audio flow

```text
Current song -> FFmpeg PCM ---\
                              ContinuousPcm -> one Opus encoder -> Discord
Next song -> RAM -> FFmpeg ---/
```

1. When the current song starts playing, the player selects one successor: the queued song, loop candidate or a random result.
2. yt-dlp downloads the complete compressed audio into RAM. No song file is written to disk. Downloading still consumes network bandwidth.
3. FFmpeg decodes the beginning into 48 kHz stereo signed 16-bit PCM. Backpressure limits decoded buffering while this song waits.
4. The mixer reserves a short tail of the current song. At the boundary it mixes both songs for **350 milliseconds**, linearly reducing the old gain while increasing the new gain.
5. The existing Discord AudioResource and Opus encoder continue running across the boundary. Changing tracks does not call `player.play()` again on this path.
6. After switching, the next successor is prepared immediately. Skip uses the same overlap when a successor is available.

The overlap shortens total playback by roughly 350 ms per transition. This is a crossfade: both songs play briefly together. It is not a sequential fade to silence and back up.

## Eligibility

Full preloading and smooth playback require a known finite duration above zero and at most 600 seconds. Longer and still-unknown clips use normal streaming. Missing selected-track duration is hydrated by `src/music/metadata.js`; see [the metadata guide](MUSIC-CONTROLS.md).

## Resource limits and cancellation

- One prepared successor per guild; simultaneous guilds each consume resources.
- Compressed audio cache limit: **32 MiB per song**. Collecting chunks and combining them can briefly use approximately twice the media size, in addition to other process memory.
- If a song exceeds that limit, preparation falls back to a bounded streaming decoder. It cannot promise that the full song is cached.
- Cache timeout: **90 seconds**; failed preparation retries after a cooldown. Decoder readiness has a separate **25-second** timeout.
- Stop, leave, radio playback and invalidated preparation stop the associated work and release references. Queue/source/genre changes invalidate an unsuitable successor.
- Decoded PCM is buffered in small blocks rather than storing an entire decoded song. PCM consumes about 192,000 bytes per second before encoding.
- Leading quiet audio is trimmed by FFmpeg on the continuous music path. Digital silence at the retained decoded tail is trimmed by the mixer. Intentional silence elsewhere in a recording remains.

## Limits and troubleshooting

A prepared successor removes the software gap caused by replacing audio resources. It cannot guarantee silence-free listening under every network condition, provider error or Discord connection problem. If Skip occurs before preparation finishes, the current song keeps playing while the successor is prepared. At a natural ending, slow preparation can still cause waiting. Enabling this mode during existing playback migrates the decoder once and may cause a brief discontinuity.

Look for `[music] next track prepared`, `fully cached` and `[music] continuous transition` in the panel logs or `tutel log`. `bounded stream` means the RAM cap fallback was used. A successful decode means samples exist; it does not prove a Discord listener's device received them.

The implementation was checked with synthetic PCM and Opus audio for natural endings and Skip: one continuous resource, no intermediate Buffering/Idle transition, and no silent test frames at the boundary. A real YouTube URL was fully cached and decoded to nonzero samples on homeserver. These checks are not an end-to-end listening guarantee for all tracks.

## Code map

| File                          | Responsibility                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| `src/music/player.js`         | Select/cancel preparation, queue/loop/random behavior, persistent player lifecycle |
| `src/music/stream.js`         | RAM cache, yt-dlp process, FFmpeg decoder and radio pipeline                       |
| `src/music/continuous-pcm.js` | PCM buffering, overlap, gain mixing and source handoff                             |
| `src/music/transition.js`     | Decoder readiness and the earlier single-resource fade helper                      |
| `src/music/settings.js`       | Per-guild persisted switch                                                         |
| `src/music/panel.js`          | Private setting buttons and per-track progress offsets                             |

## ภาษาไทย

เปิด **ตั้งค่า** ที่แผงเพลงใน Discord แล้วกดเปิด Smooth transition ข้อความตั้งค่าเห็นเฉพาะคนกดและ Dismiss ได้ กดปิดเพื่อใช้การเล่นปกติ repo เริ่มต้นปิด ส่วน homeserver/Oracle เริ่มต้นเปิดถ้ายังไม่บันทึกค่า แยกแต่ละเซิร์ฟเวอร์และเก็บในฐานข้อมูล ผู้เปลี่ยนต้องมีสิทธิ์จัดการเซิร์ฟเวอร์และผ่านการตรวจห้องเสียงตามเดิม ไม่ใช้กับวิทยุสด

เมื่อเพลงเริ่ม ระบบเลือกเพลงถัดไปหนึ่งเพลงจากคิว การวนเพลง หรือโหมดสุ่ม แล้วดึงเสียงแบบบีบอัดทั้งหมดมาเก็บใน RAM จากนั้น FFmpeg เตรียมเสียง PCM ช่วงต้นไว้รอ ไม่บันทึกไฟล์เพลงลงดิสก์ แต่ยังใช้เน็ตในการโหลดเสียงจริง

ตอนเปลี่ยนเพลง ระบบซ้อนเสียง 350 มิลลิวินาที เพลงเก่าค่อย ๆ เบาและเพลงใหม่ค่อย ๆ ดัง โดยใช้สตรีมเสียง ตัวเข้ารหัส Opus และตัวเล่น Discord เดิม จึงไม่กลับเข้าโหมดโหลดจากการสร้างตัวเล่นใหม่ทุกเพลง กดข้ามใช้วิธีเดียวกัน หลังสลับสำเร็จจะเตรียมเพลงต่อไปทันที ช่วงซ้อนทำให้เวลารวมสั้นลงประมาณ 0.35 วินาทีต่อครั้ง

เก็บเสียงบีบอัดได้สูงสุด 32 MiB ต่อเพลง ขณะรวม Buffer อาจใช้ RAM ชั่วคราวประมาณสองเท่าของไฟล์ ยังไม่รวมระบบส่วนอื่น หากเกินจะใช้สตรีมที่จำกัดบัฟเฟอร์แทน จึงไม่ได้เก็บทั้งเพลง การโหลดมี timeout 90 วินาที การรอ decoder พร้อมมี timeout 25 วินาที เตรียมเพียงหนึ่งเพลงต่อเซิร์ฟเวอร์ และแต่ละเซิร์ฟเวอร์ที่เล่นพร้อมกันใช้ทรัพยากรเพิ่ม

ระบบจำกัดการถอดเสียงไว้เป็นบล็อกเล็กด้วย backpressure ไม่ถอดทั้งเพลงค้างใน RAM การหยุด ออกจากห้อง เปิดวิทยุ หรือเปลี่ยนคิวจนเพลงที่เตรียมไว้ไม่ตรง จะยกเลิกงานและคืนทรัพยากร การตัดเงียบใช้เฉพาะต้นเสียงและท้ายที่กันไว้ ไม่ตัดการหยุดพักกลางเพลงทั้งหมด

หากกดข้ามขณะที่เพลงถัดไปยังไม่พร้อม เพลงเดิมเล่นรอไปก่อน ถ้าเพลงจบเองแต่เครือข่ายหรือแหล่งเพลงช้าก็ยังเกิดการรอได้ การเปิดโหมดระหว่างเพลงที่เล่นอยู่มีการย้าย decoder หนึ่งครั้งซึ่งอาจสะดุดสั้น ๆ ค่าโหมดคงอยู่หลังรีสตาร์ต แต่เสียงและคิวไม่ได้เล่นต่ออัตโนมัติเมื่อเปลี่ยนเครื่อง

ตรวจ log ใน panel หรือ `tutel log` คำว่า `fully cached` คือเก็บเสียงครบแล้ว ส่วน `bounded stream` คือใช้ทางสำรองเพราะเกินขนาด การทดสอบเสียงจำลองทั้งจบเองและกดข้ามไม่พบเฟรมเงียบระหว่างเพลง และลิงก์ YouTube จริงถอดได้เสียงที่ไม่เป็นศูนย์บน homeserver แต่ยังไม่ใช่การรับรองว่าเครื่องผู้ฟังทุกเครื่องได้รับเสียงครบเสมอ
