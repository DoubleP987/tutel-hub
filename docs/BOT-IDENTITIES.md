# Discord identities and music history

## Separate the calendar identity

The music identity uses `DISCORD_TOKEN`. Optionally set `CALENDAR_DISCORD_TOKEN` to the **Bot token** of a different Discord application. Leave it empty to keep calendar delivery on the music identity. An OAuth Client Secret is not a Bot token. Never commit real tokens.

1. Create a separate Discord application/bot, or use the existing Calendar application's Bot page.
2. Invite it with `bot` and `applications.commands` scopes. Grant View Channel, Send Messages, Embed Links and Read Message History in each destination channel. Administrator permission is unnecessary.
3. Set `CALENDAR_DISCORD_TOKEN` in the private server environment on both homeserver and Oracle, using the same calendar identity on both hosts.
4. Restart the active service. It discovers its own application ID and registers `/calendar` per enabled guild automatically; no separate Client ID is required for this runtime.
5. Confirm readiness and channel permissions before changing reminder routing. Removing the variable returns to the shared identity on restart.

Calendar requests, reminders and control-panel channel permission checks now use the selected calendar identity. Music commands, voice and music panels remain on the music identity. The two Discord clients share the same process, storage and cluster lease: only the active host connects. Stopping the service or disabling the host bot stops both clients. This is identity separation, not independent service deployment. An invalid calendar token leaves music running but calendar delivery unavailable; logs and `/api/bot` expose readiness without exposing credentials.

`CALENDAR_GROUPS_ENABLED` still selects legacy vs grouped calendar delivery independently. This change does **not** enable the grouped worker or migrate old channels. Existing bindings and API keys remain valid because groups/channels are not tied to an application ID. The new bot must still be present and authorized in those channels. Delivery receipts remain shared to prevent re-sending completed notifications. Already published button messages belong to the old Discord application; do not expect the new identity to receive their button interactions.

No separate token has been provisioned or enabled by this code change. Real two-identity Discord login and permission behavior require the new token and invite. Calendar web sign-in OAuth settings do not change.

## Persistent music trace

During a voice session, additions and controls edit the existing public music panel rather than posting replacement panels. Latest action stores the user's display name, action and timestamp per guild in `app_settings`. Resolved `/play` and `/playnext` tracks also retain the requesting display name, including playlist entries. Radio selection records the station and actor; random generation has no individual requesting user on each automatically selected track.

After stop or queue completion, the existing panel becomes a playback summary. On leaving voice, automatic disconnect, host shutdown or restart, the panel becomes a compact playback-history embed without buttons. It includes up to ten recent distinct tracks observed by the panel and their requesting names where available, without the latest-action field. Latest action is only shown while the control panel is active. The next voice session creates one new panel and preserves the previous history message in chat. It does not generate a separate permanent message for every click or track. Private confirmations still expire normally.

History is a bounded summary, not a full audit log. Repeating the same URL/title is consolidated. Failed or extremely short playback may not enter the observed summary. Deleted historical messages cannot be restored, and messages deleted before this change remain lost. Discord channel permissions and message-retention policies still apply. Names can later change; the record stores the display name at the time, not a verified identity assertion.

## Implementation map

- `src/bot/calendar-runtime.js`: second Discord client, calendar-only interactions and readiness.
- `src/bot/runtime.js`: coordinated identity lifecycle and selected calendar client.
- `src/index.js`: selected client supplied to one reminder scheduler.
- `src/web/routes/discord.js`, `calendar-admin.js`: calendar channel validation.
- `src/music/panel.js`: per-guild serialized latest-action writes, bounded track snapshots and archive edits.
- `src/music/requests.js`: attach requesting name after resolving tracks and record committed additions.
- Music/radio command handlers: record user actions without changing reminder scheduling.

These changes were reviewed and formatted. Production service startup can confirm process readiness; it does not verify audible playback or a second calendar identity without its credentials.

## Startup and unavailable successors

Initial playback waits for an audio source before calling the Discord player. A failed/empty extraction is retried once with a fresh extraction and alternate m4a format. Each source readiness wait is bounded at 20 seconds; cancellation destroys the source. Healthy prefetched resources are reused. Preloading prefers m4a to avoid the observed failing Opus media path; no browser cookies are added.

Smooth Skip uses a prepared successor immediately. If none is ready, pending preparation is cancelled and the old song fades out immediately, advancing the queue without waiting for that preload. Skip during initial extraction cancels the selected song, even when Loop is enabled. Invalid/age-restricted media is not bypassed: the normal failed-track handling skips it. This recovery can contain a gap because no successor audio exists. The confirmation says “Skipping song…” to acknowledge a pending transition, not a completed one. A stalled decoder with no available PCM is ended immediately rather than waiting for a fade tail.

Focused startup, Skip, loop, playlist and panel lifecycle regression tests: 31 passed. They use mocked processes/Discord objects; they do not replace an audible Discord playback check.

Brave/Discord verification on 10 October 2026: `/join`, a single initial song request with queue loop and Smooth enabled, a prepared one-song loop Skip, and Skip without a ready successor all advanced playback. A restricted YouTube successor failed and the next usable queued song started; the original panel message was reused. Leaving voice retained a history embed without controls or the latest-action field. Loop was restored to off after testing. Verification used visible Discord state and server playback/transition logs, not an independent listening check. A loading title is now excluded from playback history until audio readiness succeeds; old summaries are not rewritten.
