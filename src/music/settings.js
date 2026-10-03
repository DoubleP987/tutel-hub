import { t } from '../i18n/bot.js';
import { setting, setSetting } from '../calendar/db.js';
import { musicChanged } from './events.js';
import { randomGenres } from './genres.js';

export const musicSources = ['youtube', 'soundcloud'];
export function getSmoothMode(guildId) {
  return setting(`music_smooth:${guildId}`) === '1';
}
export async function setSmoothMode(guildId, enabled) {
  await setSetting(`music_smooth:${guildId}`, enabled ? '1' : '0');
  musicChanged(guildId);
  return !!enabled;
}
export function getRandomGenre(guildId) {
  const value = setting(`music_random_genre:${guildId}`);
  return randomGenres.some((genre) => genre.value === value) ? value : 'all';
}
export async function setRandomGenre(guildId, value) {
  if (!randomGenres.some((genre) => genre.value === value)) throw new Error('Unknown music genre');
  await setSetting(`music_random_genre:${guildId}`, value);
  musicChanged(guildId);
}

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
