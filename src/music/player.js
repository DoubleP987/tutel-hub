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
import { getMusicSource } from './settings.js';
const players = new Map();
function getState(guildId) {
  if (!players.has(guildId)) {
    const state = {
      queue: [],
      current: null,
      player: createAudioPlayer({ behaviors: { noSubscriber: NoSubscriberBehavior.Pause } }),
      connection: null,
      stream: null,
      randomMode: false,
      radio: null,
      randomHistory: [],
      loadingNext: false,
      generation: 0,
      nextTimer: null,
      startupTimer: null,
      searchAbort: null,
      failures: 0,
    };
    state.player.on('stateChange', (oldState, newState) =>
      console.log('[voice] player ' + oldState.status + ' -> ' + newState.status),
    );
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
      clearTimeout(state.startupTimer);
      state.stream?.stop();
      state.current = null;
      state.stream = null;
      scheduleNext(guildId, state, 500);
    });
    players.set(guildId, state);
  }
  return players.get(guildId);
}
function ensureConnection(guildId, voiceChannel, state) {
  if (!state.connection) {
    state.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    state.connection.subscribe(state.player);
    state.connection.on('stateChange', (oldState, newState) =>
      console.log('[voice] connection ' + oldState.status + ' -> ' + newState.status),
    );
    state.connection.on('error', (error) => console.error('[voice] connection error:', error));
    state.connection.on('debug', (message) => console.log('[voice] ' + message));
    state.connection.on(VoiceConnectionStatus.Disconnected, () => destroyPlayer(guildId));
  } else if (state.connection.joinConfig.channelId !== voiceChannel.id)
    throw new Error('บอตอยู่ใน voice channel อื่นแล้ว');
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
    if (state.searchAbort === abort) state.searchAbort = null;
    if (state.generation !== generation && state.randomMode && !state.current)
      scheduleNext(guildId, state, 0);
  }
}
export function enqueue(guildId, voiceChannel, track) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.player.stop(true);
  }
  state.queue.push(track);
  if (!state.current) void playNext(guildId);
  return state.queue.length;
}
export async function enableRandomMode(guildId, voiceChannel) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.player.stop(true);
  }
  state.randomMode = true;
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
export function playRadio(guildId, voiceChannel, station) {
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
  state.radio = station;
  state.stream = createRadioResource(station);
  state.player.play(state.stream.resource);
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
  state.stream?.stop();
  state.player.stop(true);
  return true;
}
export function stop(guildId) {
  const state = players.get(guildId);
  if (!state) return;
  state.generation++;
  state.searchAbort?.abort();
  clearTimeout(state.nextTimer);
  clearTimeout(state.startupTimer);
  state.randomMode = false;
  state.radio = null;
  state.queue.length = 0;
  state.current = null;
  state.stream?.stop();
  state.stream = null;
  state.player.stop(true);
  clearRandomSession(guildId);
}
export function destroyPlayer(guildId) {
  const state = players.get(guildId);
  if (!state) return;
  stop(guildId);
  state.connection?.destroy();
  players.delete(guildId);
}
