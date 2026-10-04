# Bot language and private help

**Current behavior / การทำงานล่าสุด:** [Music controls, metadata, Loop and menu expiration](MUSIC-CONTROLS.md). This guide takes precedence over older behavior examples below. / ใช้คู่มือนี้แทนตัวอย่างพฤติกรรมรุ่นเก่าด้านล่าง

## Configuration

The bot uses Thai by default. Edit `src/config/bot.js`:

```js
export const botConfig = Object.freeze({
  language: 'th', // use 'en' for English
  website: 'https://tutelbot.vercel.app',
  repository: 'https://github.com/DoubleP987/tutel-hub',
});
```

Alternatively, use `.env`:

```dotenv
BOT_LANGUAGE=en
BOT_WEBSITE_URL=https://tutelbot.vercel.app
```

A nonempty `BOT_LANGUAGE` overrides the code config. To use the code value, remove that environment variable or leave it blank. Only `th` and `en` are accepted. Invalid values stop startup with a clear error. A change requires a process restart (`npm start`, or `systemctl --user restart tutelbot.service`). For failover installations, configure both nodes consistently. The deployed installation remains Thai.

## What changes

Music controls (including Loop), playback status, queue/modal labels, slash-command replies and descriptions, radio lookup messages, reminder buttons, daily-summary headings, dates and built-in notification category labels. The timezone remains Asia/Bangkok in either language. Slash names such as `/play`, `/radio`, `/calendar`, `/help` and their option values remain stable.

User event titles/descriptions, song and station names, saved custom notification templates and existing stored content are not translated. The admin and calendar web interfaces and promotional website retain their own language/theme behavior. Changing the bot language does not translate these websites. Older sent notification text is not rewritten automatically.

`src/i18n/en.json` holds the English translations keyed by the original Thai text; `src/i18n/bot.js` selects the configured language and inserts `{0}`, `{1}` placeholders. Keep placeholders identical in both languages. Do not put secrets in translation files.

## Slash descriptions and profile

After changing the language, register command descriptions again:

```sh
npm run register
```

Registration uses the current bot language and needs Discord credentials. Guild-only development registration is `npm run register:guild`; avoid leaving guild duplicates alongside global commands.

The profile description is independent of runtime message updates. To explicitly save the description and website link using the current language:

```sh
npm run profile:update
```

This updates the Discord application description only. It does not replace the avatar, banner, credentials or install permissions. `src/config/profile.js` contains its text. You may also edit it manually in Discord Developer Portal → your application → General Information → Description.

## /help

`/help` replies with `MessageFlags.Ephemeral` (64): only the person who invoked it sees the message. It includes link buttons for the website, guide and GitHub repository. Clicking a link opens the browser; it does not post another public Discord message. Website: https://tutelbot.vercel.app; guide: https://tutelbot.vercel.app/guide.html. No voice channel or admin permission is required.

## Checks

`node --test tests/bot-language.test.js` verifies both languages, valid command payloads, placeholder translation, default Thai, private help flags/links, and preservation of user event text. Run tests before publishing translation changes.

[ภาษาไทย](BOT-LANGUAGE.th.md)
