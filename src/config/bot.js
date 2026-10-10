import 'dotenv/config';
// Change to 'en' for English. BOT_LANGUAGE in .env takes precedence when set.
export const botConfig = Object.freeze({
  language: 'th',
  website: 'https://tutelbot.vercel.app',
  repository: 'https://github.com/DoubleP987/tutel-hub',
  statusText: '/help | tutelbot.vercel.app',
});
const selected = (process.env.BOT_LANGUAGE || botConfig.language).trim().toLowerCase();

if (!['th', 'en'].includes(selected)) {
  throw new Error('BOT_LANGUAGE must be th or en.');
}

export const botLanguage = selected;
export const botLocale = selected === 'th' ? 'th-TH' : 'en-GB';
export const botWebsite = process.env.BOT_WEBSITE_URL || botConfig.website;
