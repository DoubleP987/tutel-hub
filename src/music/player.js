import { t } from '../i18n/bot.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
} from '@discordjs/voice';
import { createTrackResource, createRadioResource } from './stream.js';
import { resolveRandomTrack, clearRandomSession } from './random.js';
import { getMusicSource, getRandomGenre } from './settings.js';
import { musicChanged, musicLeft, invalidateMusicRequests } from './events.js';
import { requireBotLease } from '../cluster/state.js';
import {
  insertTracks,
  removeTrack,
  moveTrack,
  shuffleTracks,
  repeatFinishedTrack,
} from './queue.js';
const players = new Map();
function getState(guildId) {
  if (!players.has(guildId)) {
    const state = {
      queue: [],
      current: null,
      lastTrack: null,
      player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } }),
      connection: null,
      stream: null,
      randomMode: false,
      randomGenre: getRandomGenre(guildId),
      loopMode: false,
      bypassLoop: false,
      radio: null,
      randomHistory: [],
      loadingNext: false,
      generation: 0,
      nextTimer: null,
      startupTimer: null,
      emptyTimer: null,
      searchAbort: null,
      failures: 0,
    };
    state.player.on('stateChange', (oldState, newState) => {
      console.log('[voice] player ' + oldState.status + ' -> ' + newState.status);
      musicChanged(guildId, state.lastTrack);
    });
    state.player.on('error', (error) => {
      console.error('[voice] player error:', error.message);
      if (state.radio) return;
      clearTimeout(state.startupTimer);
      state.stream?.stop();
      state.stream = null;
      state.current = null;
      scheduleNext(guildId, state, 2000);
    });
    state.player.on(AudioPlayerStatus.Idle, () => {
      if (state.radio) {
        const station = state.radio;
        setTimeout(() => {
          if (
            players.get(guildId) !== state ||
            state.radio !== station ||
            state.player.state.status !== AudioPlayerStatus.Idle
          )
            return;
          try {
            state.stream = createRadioResource(station);
            state.player.play(state.stream.resource);
          } catch (error) {
            console.error('[radio] reconnect failed:', error);
          }
        }, 5000);
        return;
      }
      if (!state.current) return;
      const played = !state.stream?.failed && (state.stream?.resource?.playbackDuration || 0) > 0;
      repeatFinishedTrack(state, played);
      if (!played) console.warn('[music] unavailable/empty track skipped:', state.current.title);
      state.bypassLoop = false;
      clearTimeout(state.startupTimer);
      state.stream?.stop();
      state.current = null;
      state.stream = null;
      musicChanged(guildId, state.lastTrack);
      scheduleNext(guildId, state, 500);
    });
    players.set(guildId, state);
  }
  return players.get(guildId);
}
function ensureConnection(guildId, voiceChannel, state) {
  requireBotLease();
  if (!state.connection) {
    const limit = Number(process.env.MAX_ACTIVE_VOICE_GUILDS || 0);
    if (limit > 0 && [...players.values()].filter((player) => player.connection).length >= limit)
      throw new Error(t('เครื่องนี้รองรับห้องเสียงพร้อมกันสูงสุด ') + limit + t(' ห้อง'));
    state.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      // Cosmetic undeafen only: no receiver subscriptions or audio decoding are started.
      selfDeaf: process.env.VOICE_SELF_DEAF === 'true',
    });
    state.connection.subscribe(state.player);
    state.connection.on('stateChange', (oldState, newState) =>
      console.log('[voice] connection ' + oldState.status + ' -> ' + newState.status),
    );
    state.connection.on('error', (error) => console.error('[voice] connection error:', error));
    state.connection.on('debug', (message) => console.log('[voice] ' + message));
    state.connection.on(VoiceConnectionStatus.Disconnected, () => destroyPlayer(guildId));
  } else if (state.connection.joinConfig.channelId !== voiceChannel.id)
    throw new Error(t('บอตอยู่ใน voice channel อื่นแล้ว'));
}
function scheduleNext(guildId, state, delay = 0) {
  clearTimeout(state.nextTimer);
  const generation = state.generation;
  state.nextTimer = setTimeout(() => {
    state.nextTimer = null;
    if (players.get(guildId) === state && state.generation === generation && !state.radio)
      void playNext(guildId);
  }, delay);
  state.nextTimer.unref();
}
async function playNext(guildId) {
  const state = players.get(guildId);
  if (!state || state.current || state.loadingNext) return;
  state.loadingNext = true;
  musicChanged(guildId);
  const generation = state.generation;
  const abort = new AbortController();
  state.searchAbort = abort;
  try {
    let track = state.queue.shift() || null;
    const fromRandom = !track && state.randomMode;
    if (!track && state.randomMode)
      track = await resolveRandomTrack(state.randomHistory, getMusicSource(guildId), {
        guildId,
        signal: abort.signal,
        genre: state.randomGenre,
      });
    if (players.get(guildId) !== state || state.generation !== generation) return;
    if (track && state.queue.length && fromRandom) {
      // A user's queued track takes priority over an in-flight random search.
      const queued = state.queue.shift();
      state.queue.unshift(track);
      track = queued;
    }
    if (!track) return;
    state.current = track;
    state.bypassLoop = false;
    state.lastTrack = track;
    musicChanged(guildId, track);
    if (state.randomMode) {
      state.randomHistory.push(track.url);
      if (state.randomHistory.length > 80) state.randomHistory.shift();
    }
    state.stream = createTrackResource(track);
    state.player.play(state.stream.resource);
    clearTimeout(state.startupTimer);
    state.startupTimer = setTimeout(() => {
      if (
        players.get(guildId) !== state ||
        state.generation !== generation ||
        state.current !== track
      )
        return;
      if (
        [
          AudioPlayerStatus.Playing,
          AudioPlayerStatus.Paused,
          AudioPlayerStatus.AutoPaused,
        ].includes(state.player.state.status)
      )
        return;
      console.warn('[random] audio did not start; moving to another track');
      state.stream?.stop();
      state.current = null;
      state.stream = null;
      state.player.stop(true);
      scheduleNext(guildId, state, 1000);
    }, 35000);
    state.startupTimer.unref();
    state.failures = 0;
    return track;
  } catch (error) {
    if (state.generation !== generation || abort.signal.aborted) return;
    console.error('[music] failed to find/start next track:', error.message);
    state.stream?.stop();
    state.stream = null;
    state.current = null;
    state.failures++;
    if (state.randomMode && players.get(guildId) === state && state.generation === generation) {
      scheduleNext(guildId, state, Math.min(30000, 2000 * state.failures));
    } else if (state.queue.length) {
      scheduleNext(guildId, state, 1000);
    }
  } finally {
    state.loadingNext = false;
    musicChanged(guildId, state.lastTrack);
    if (state.searchAbort === abort) state.searchAbort = null;
    if (
      state.generation !== generation &&
      (state.randomMode || state.queue.length) &&
      !state.current
    )
      scheduleNext(guildId, state, 0);
  }
}
export function enqueue(guildId, voiceChannel, track) {
  enqueueMany(guildId, voiceChannel, [track]);
  return getState(guildId).queue.length;
}
export function enqueueMany(guildId, voiceChannel, tracks, options = {}) {
  const state = getState(guildId);
  if (state.queue.length >= 500) throw new Error(t('คิวเต็มแล้ว (สูงสุด 500 เพลง)'));
  ensureConnection(guildId, voiceChannel, state);
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.player.stop(true);
  }
  const result = insertTracks(state.queue, tracks, options);
  musicChanged(guildId, state.lastTrack);
  if (!state.current) void playNext(guildId);
  return result;
}
export function editQueue(guildId, action, from, to) {
  const state = players.get(guildId);
  if (!state) return null;
  let result;
  if (action === 'remove') result = removeTrack(state.queue, from);
  else if (action === 'move') result = moveTrack(state.queue, from, to);
  else if (action === 'clear') {
    result = state.queue.length;
    state.queue.length = 0;
  } else if (action === 'shuffle') {
    shuffleTracks(state.queue);
    result = state.queue.length;
  }
  musicChanged(guildId, state.lastTrack);
  return result;
}
export async function enableRandomMode(guildId, voiceChannel) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  const genre = getRandomGenre(guildId);
  if (state.randomGenre !== genre && state.loadingNext && !state.current) {
    state.generation++;
    state.searchAbort?.abort();
  }
  state.randomGenre = genre;
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.player.stop(true);
  }
  state.randomMode = true;
  musicChanged(guildId, state.lastTrack);
  if (!state.current) await playNext(guildId);
  if (state.player.state.status === AudioPlayerStatus.Paused) state.player.unpause();
  if (state.current) {
    try {
      await entersState(state.player, AudioPlayerStatus.Playing, 35000);
    } catch {
      /* Startup watchdog moves to another song; keep random mode enabled. */
    }
  }
  return state;
}
export function disableRandomMode(guildId) {
  const state = players.get(guildId);
  if (!state) return false;
  state.randomMode = false;
  if (state.loadingNext && !state.current) {
    state.generation++;
    state.searchAbort?.abort();
  }
  if (!state.queue.length) clearTimeout(state.nextTimer);
  musicChanged(guildId, state.lastTrack);
  return true;
}
export function playRadio(guildId, voiceChannel, station) {
  invalidateMusicRequests(guildId);
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  state.generation++;
  state.searchAbort?.abort();
  clearTimeout(state.nextTimer);
  clearTimeout(state.startupTimer);
  state.queue.length = 0;
  state.randomMode = false;
  state.current = null;
  state.stream?.stop();
  state.loopMode = false;
  state.bypassLoop = false;
  state.radio = station;
  state.lastTrack = { title: t('วิทยุสด · {0}', station.name), duration: 0 };
  state.stream = createRadioResource(station);
  state.player.play(state.stream.resource);
  musicChanged(guildId, state.lastTrack);
  return state;
}
export function getPlayer(guildId) {
  return players.get(guildId);
}
export function pausePlayer(guildId) {
  const state = players.get(guildId);
  return !!state?.player.pause();
}
export function resumePlayer(guildId) {
  const state = players.get(guildId);
  return !!state?.player.unpause();
}
export function skip(guildId) {
  const state = players.get(guildId);
  if (!state?.current) return false;
  state.bypassLoop = true;
  state.stream?.stop();
  state.player.stop(true);
  return true;
}
export function toggleLoop(guildId) {
  const state = players.get(guildId);
  if (!state?.current || state.radio) return null;
  state.loopMode = state.loopMode === 'queue' ? false : state.loopMode ? 'queue' : 'track';
  musicChanged(guildId, state.lastTrack);
  return state.loopMode;
}
export function setLoop(guildId, mode) {
  const state = players.get(guildId);
  if (!state || state.radio || !['off', 'track', 'queue'].includes(mode)) return null;
  state.loopMode = mode === 'off' ? false : mode;
  musicChanged(guildId, state.lastTrack);
  return mode;
}
export function stop(guildId) {
  invalidateMusicRequests(guildId);
  const state = players.get(guildId);
  if (!state) return;
  state.generation++;
  state.searchAbort?.abort();
  clearTimeout(state.nextTimer);
  clearTimeout(state.startupTimer);
  state.randomMode = false;
  state.loopMode = false;
  state.bypassLoop = false;
  state.radio = null;
  state.queue.length = 0;
  state.current = null;
  state.stream?.stop();
  state.stream = null;
  state.player.stop(true);
  clearRandomSession(guildId);
  musicChanged(guildId, state.lastTrack);
}
export function destroyPlayer(guildId) {
  const state = players.get(guildId);
  if (!state) {
    invalidateMusicRequests(guildId);
    musicLeft(guildId);
    return;
  }
  stop(guildId);
  clearTimeout(state.emptyTimer);
  state.connection?.destroy();
  players.delete(guildId);
  musicLeft(guildId);
  musicChanged(guildId, state.lastTrack);
}
export function watchEmptyVoice(guildId, humanCount) {
  const state = players.get(guildId);
  if (!state?.connection) return;
  if (humanCount > 0) {
    clearTimeout(state.emptyTimer);
    state.emptyTimer = null;
    return;
  }
  if (state.emptyTimer) return;
  const configured = Number(process.env.VOICE_EMPTY_LEAVE_SECONDS ?? 120);
  if (!Number.isFinite(configured) || configured <= 0) return;
  state.emptyTimer = setTimeout(
    () => {
      if (players.get(guildId) === state) destroyPlayer(guildId);
    },
    Math.min(3600, configured) * 1000,
  );
  state.emptyTimer.unref();
}
