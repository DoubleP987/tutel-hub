import { t } from '../i18n/bot.js';
import { setting, setSetting } from '../calendar/db.js';
import { musicChanged } from './events.js';

export const musicSources = ['youtube', 'soundcloud'];

export function getMusicSource(guildId) {
  if (musicSources.includes(process.env.MUSIC_SOURCE_OVERRIDE))
    return process.env.MUSIC_SOURCE_OVERRIDE;
  const source = setting(`music_source:${guildId}`);
  return musicSources.includes(source) ? source : 'youtube';
}

export async function setMusicSource(guildId, source) {
  if (
    musicSources.includes(process.env.MUSIC_SOURCE_OVERRIDE) &&
    source !== process.env.MUSIC_SOURCE_OVERRIDE
  )
    throw new Error(t('เครื่องสำรองนี้ใช้ ') + musicSourceLabel(process.env.MUSIC_SOURCE_OVERRIDE));
  if (!musicSources.includes(source)) throw new Error(t('เลือก YouTube หรือ SoundCloud'));
  await setSetting(`music_source:${guildId}`, source);
  musicChanged(guildId);
  return source;
}

export function musicSourceLabel(source) {
  return source === 'soundcloud' ? 'SoundCloud' : 'YouTube';
}
