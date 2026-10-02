import { EventEmitter } from 'node:events';

// Playback publishes changes without depending on Discord message rendering.
export const musicEvents = new EventEmitter();
const revisions = new Map();
export const musicRequestVersion = (guildId) => revisions.get(guildId) || 0;
export function invalidateMusicRequests(guildId) {
  revisions.set(guildId, musicRequestVersion(guildId) + 1);
  musicEvents.emit('cancel', guildId);
}
export function musicChanged(guildId, lastTrack = null) {
  musicEvents.emit('change', guildId, lastTrack);
}
export function musicLeft(guildId) {
  musicEvents.emit('leave', guildId);
}
