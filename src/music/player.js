import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import { createTrackResource, createRadioResource, resolveRandomTrack } from './stream.js';
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
    };
    state.player.on('stateChange', (oldState, newState) =>
      console.log('[voice] player ' + oldState.status + ' -> ' + newState.status),
    );
    state.player.on('error', (error) => console.error('[voice] player error:', error));
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
      state.current = null;
      state.stream = null;
      void playNext(guildId);
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
async function playNext(guildId) {
  const state = players.get(guildId);
  if (!state || state.current || state.loadingNext) return;
  state.loadingNext = true;
  const generation = state.generation;
  try {
    let track = state.queue.shift() || null;
    if (!track && state.randomMode) track = await resolveRandomTrack(state.randomHistory);
    if (players.get(guildId) !== state || state.generation !== generation) return;
    if (state.queue.length) {
      if (track && state.randomMode && !state.queue.some((item) => item.url === track.url))
        state.queue.unshift(track);
      track = state.queue.shift();
    }
    if (!track) return;
    state.current = track;
    if (state.randomMode) {
      state.randomHistory.push(track.url);
      if (state.randomHistory.length > 30) state.randomHistory.shift();
    }
    state.stream = createTrackResource(track);
    state.player.play(state.stream.resource);
  } catch (error) {
    console.error('[music] failed to find/start next track:', error);
    if (state.randomMode && players.get(guildId) === state && state.generation === generation) {
      setTimeout(() => {
        if (players.get(guildId) === state && state.randomMode) void playNext(guildId);
      }, 5000);
    }
  } finally {
    state.loadingNext = false;
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
export function enableRandomMode(guildId, voiceChannel) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.player.stop(true);
  }
  state.randomMode = true;
  if (!state.current) void playNext(guildId);
  return state;
}
export function playRadio(guildId, voiceChannel, station) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  state.generation++;
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
  state.randomMode = false;
  state.radio = null;
  state.queue.length = 0;
  state.current = null;
  state.stream?.stop();
  state.stream = null;
  state.player.stop(true);
}
export function destroyPlayer(guildId) {
  const state = players.get(guildId);
  if (!state) return;
  stop(guildId);
  state.connection?.destroy();
  players.delete(guildId);
}
