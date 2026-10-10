# Documentation index / สารบัญเอกสาร

Updated 10 October 2026. Read the current status and user guide first, then architecture/API/development guides. Feature documents explain the exact contract; historical learning chapters retain an explicit legacy context.

| Document                                                 | First heading                                                |
| -------------------------------------------------------- | ------------------------------------------------------------ |
| [ARCHITECTURE.md](ARCHITECTURE.md)                       | Architecture and maintenance                                 |
| [BOT-IDENTITIES.md](BOT-IDENTITIES.md)                   | Discord identities and music history                         |
| [BOT-IDENTITIES.th.md](BOT-IDENTITIES.th.md)             | แยกตัวตนบอทและเก็บประวัติเพลง                                |
| [BOT-LANGUAGE.md](BOT-LANGUAGE.md)                       | Bot language and private help                                |
| [BOT-LANGUAGE.th.md](BOT-LANGUAGE.th.md)                 | ตั้งภาษาบอทและคำสั่ง /help                                   |
| [CALENDAR-API.md](CALENDAR-API.md)                       | Public calendar API / การส่งข้อมูลปฏิทิน                     |
| [CODE-STYLE.md](CODE-STYLE.md)                           | Source readability / แนวทางเขียนโค้ดให้อ่านง่าย              |
| [CURRENT-OPERATIONS.md](CURRENT-OPERATIONS.md)           | Current operation / การทำงานปัจจุบัน                         |
| [DAILY-SUMMARY-AND-MUSIC.md](DAILY-SUMMARY-AND-MUSIC.md) | Daily summaries and music sources / สรุปรายวันและแหล่งเพลง   |
| [DEVELOPMENT.md](DEVELOPMENT.md)                         | Developer handbook: Tutel music bot                          |
| [DEVELOPMENT.th.md](DEVELOPMENT.th.md)                   | คู่มือผู้พัฒนา Tutel บอทเพลง                                 |
| [FEEDBACK.md](FEEDBACK.md)                               | Calendar Feedback inbox / กล่อง Feedback                     |
| [GROUPS.md](GROUPS.md)                                   | Multi-group Calendar — implementation guide                  |
| [GROUPS.th.md](GROUPS.th.md)                             | ระบบปฏิทินหลายกลุ่ม — คู่มือภาษาไทย                          |
| [HANDBOOK.en.md](HANDBOOK.en.md)                         | TUTEL HUB                                                    |
| [HANDBOOK.th.md](HANDBOOK.th.md)                         | TUTEL HUB                                                    |
| [MONGODB-FAILOVER.md](MONGODB-FAILOVER.md)               | MongoDB and two-node failover / MongoDB และระบบเครื่องสำรอง  |
| [MUSIC-CONTROLS.md](MUSIC-CONTROLS.md)                   | Music controls and metadata / เมนูเพลงและข้อมูลความยาว       |
| [MUSIC-LOOP.md](MUSIC-LOOP.md)                           | Music loop and skip — 10 October 2026                        |
| [MUSIC-PANEL.md](MUSIC-PANEL.md)                         | Persistent chat music panel / แผงเพลงในแชท                   |
| [PLAYLIST-AND-QUEUE.md](PLAYLIST-AND-QUEUE.md)           | Playlists, queue controls and random genres                  |
| [PROJECT-SEPARATION.md](PROJECT-SEPARATION.md)           | Project boundaries and source structure / ขอบเขตและโครงสร้าง |
| [PROJECT-SEPARATION.th.md](PROJECT-SEPARATION.th.md)     | การแยกโปรเจกต์และแนวทางดูแลโค้ด                              |
| [RADIO-AND-PANEL.md](RADIO-AND-PANEL.md)                 | Radio and control panel / วิทยุและหน้าควบคุม                 |
| [RANDOM-MUSIC.md](RANDOM-MUSIC.md)                       | Continuous random music / สุ่มเพลงต่อเนื่อง                  |
| [SMOOTH-TRANSITION.md](SMOOTH-TRANSITION.md)             | Smooth music transitions / การเปลี่ยนเพลงแบบต่อเนื่อง        |
| [SQLITE.md](SQLITE.md)                                   | SQLite setup and backups / การตั้งค่าและสำรอง SQLite         |
| [VERCEL.md](VERCEL.md)                                   | Vercel public calendar                                       |

The independent Learning Lab is at D:/Tutel-Learning-Lab. Its source snapshots and current-system lessons cover both repositories; the Lab is neither deployed nor committed with these applications.

Keep Markdown and the matching Thai/English PDF editions aligned when user-facing behavior changes. Credential values, databases, live sessions, uploads and private operational backups never belong in documentation.
