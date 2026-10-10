# Music loop and skip — 10 October 2026

Default for a guild with no saved preference is **off**. Existing off/track/queue choices remain saved independently per guild. Smooth defaults/configuration are preserved on each host.

- Off: skip goes to the next queued/random song; without a successor it ends playback.
- Song/track loop: skip advances to a queued/random successor. If there is no successor, it restarts the current song instead of stopping.
- Queue loop: skip advances around the queue and retains the skipped track for a later rotation. One-track queues can restart their sole song.

Decoder `stop()` records intentional shutdown. An expected FFmpeg/downloader termination during a skip, crossfade or cleanup does not mark the track failed. Genuine decoding/downloading failures remain failures and are not recycled indefinitely.

Regression coverage: `node --test tests/loop-skip.test.js tests/music-playlist.test.js` passed 19 cases. Synthetic tests exercise actual skip function code and decoder lifecycle callbacks, plus queue/playlist behavior, without Discord messages or live downloads. They do not prove end-to-end audible playback on every guild. Only music source files were deployed to homeserver and Oracle; unrelated configuration/secrets were preserved. No Git push.
