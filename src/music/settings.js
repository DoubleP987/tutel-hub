import { setting, setSetting } from '../calendar/db.js';

export const musicSources = ['youtube', 'soundcloud'];

export function getMusicSource(guildId) {
  const source = setting(`music_source:${guildId}`);
  return musicSources.includes(source) ? source : 'youtube';
}

export function setMusicSource(guildId, source) {
  if (!musicSources.includes(source)) throw new Error('เลือก YouTube หรือ SoundCloud');
  setSetting(`music_source:${guildId}`, source);
  return source;
}

export function musicSourceLabel(source) {
  return source === 'soundcloud' ? 'SoundCloud' : 'YouTube';
}
