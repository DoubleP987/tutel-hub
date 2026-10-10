import { openTrackSource } from './startup.js';
import { hydrateTrack } from './metadata.js';
import { t } from '../i18n/bot.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  NoSubscriberBehavior,
  entersState,
  createAudioResource,
  StreamType,
} from '@discordjs/voice';
import { createTrackResource, createRadioResource, cacheTrackAudio } from './stream.js';
import { ContinuousPcm } from './continuous-pcm.js';
import { resolveRandomTrack, clearRandomSession } from './random.js';
import {
  getMusicSource,
  getRandomGenre,
  getSmoothMode,
  getLoopMode,
  saveLoopMode,
} from './settings.js';
import { FADE_MS, resourceReady } from './transition.js';
import { musicChanged, musicLeft, invalidateMusicRequests, musicRequestVersion } from './events.js';
import { requireBotLease } from '../cluster/state.js';
import {
  insertTracks,
  removeTrack,
  moveTrack,
  shuffleTracks,
  repeatFinishedTrack,
} from './queue.js';
const players = new Map();
const canSmooth = (track) => Number(track?.duration) > 0 && Number(track.duration) <= 600;
function getState(guildId) {
  if (!players.has(guildId)) {
    const state = {
      queue: [],
      current: null,
      lastTrack: null,
      player: createAudioPlayer({
        behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
      }),
      connection: null,
      stream: null,
      randomMode: false,
      randomGenre: getRandomGenre(guildId),
      loopMode: getLoopMode(guildId) === 'off' ? false : getLoopMode(guildId),
      bypassLoop: false,
      radio: null,
      suspendedMusic: null,
      radioPrepareAbort: null,
      randomHistory: [],
      loadingNext: false,
      generation: 0,
      nextTimer: null,
      startupTimer: null,
      emptyTimer: null,
      standbyTimer: null,
      standby: false,
      searchAbort: null,
      failures: 0,
      radioRetries: 0,
      radioTimer: null,
      smoothMode: getSmoothMode(guildId),
      prepared: null,
      prepareAbort: null,
      prepareTask: null,
      prepareRetryAt: 0,
      transitionTimer: null,
      fadeTimer: null,
      mixer: null,
    };
    state.player.on('stateChange', (oldState, newState) => {
      updateStandby(guildId, state);
      console.log('[voice] player ' + oldState.status + ' -> ' + newState.status);
      if (
        newState.status === AudioPlayerStatus.Playing &&
        state.smoothMode &&
        state.current &&
        !state.radio
      ) {
        ensureContinuous(guildId, state);
        void prepareNext(guildId, state);
      }
      musicChanged(guildId, state.lastTrack);
    });
    state.player.on('error', (error) => {
      console.error('[voice] player error:', error.message);
      if (state.radio) {
        state.stream?.stop();
        state.player.stop(true);
        return;
      }
      clearTimeout(state.startupTimer);
      state.stream?.stop();
      state.stream = null;
      state.current = null;
      scheduleNext(guildId, state, 2000);
    });
    state.player.on(AudioPlayerStatus.Idle, () => {
      if (state.radio) {
        const station = state.radio;
        const stream = state.stream;
        const played = (stream?.resource?.playbackDuration || 0) > 10000;
        state.radioRetries = played ? 0 : state.radioRetries + 1;
        stream?.stop();
        state.stream = null;
        if (state.radioRetries >= 3) {
          console.warn('[radio] stopped after repeated empty streams:', station.name);
          state.radio = null;
          updateStandby(guildId, state);
          musicChanged(guildId, state.lastTrack);
          return;
        }
        clearTimeout(state.radioTimer);
        state.radioTimer = setTimeout(() => {
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
        state.radioTimer.unref();
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
      if (state.smoothMode && state.prepared && !state.loadingNext) void playNext(guildId);
      else scheduleNext(guildId, state, state.smoothMode ? 0 : 500);
    });
    players.set(guildId, state);
  }
  return players.get(guildId);
}
function clearPrepared(state, force = false) {
  if (state.mixer?.fade && !force) return;
  state.prepareAbort?.abort();
  state.prepareAbort = null;
  state.prepared?.stream.stop();
  state.prepared = null;
  state.mixer?.clearNext();
}
function continuousStream(guildId, state, source, track) {
  let activeSource = source;
  const mixer = new ContinuousPcm({
    smooth: state.smoothMode,
    onSwitch: (oldTrack, nextTrack, skipped, nextSource) => {
      state.bypassLoop = skipped;
      repeatFinishedTrack(state, !activeSource.failed);
      const position = state.queue.findIndex((item) => item.url === nextTrack.url);
      if (position >= 0) state.queue.splice(position, 1);
      activeSource = nextSource;
      state.prepared = null;
      state.current = nextTrack;
      state.trackStartedAtResourceMs = state.stream.resource.playbackDuration;
      clearTimeout(state.startupTimer);
      state.lastTrack = nextTrack;
      state.bypassLoop = false;
      if (state.randomMode) {
        state.randomHistory.push(nextTrack.url);
        state.randomHistory = state.randomHistory.slice(-80);
      }
      musicChanged(guildId, nextTrack);
      console.log('[music] continuous transition:', oldTrack.title, '->', nextTrack.title);
      void prepareNext(guildId, state);
    },
    onEnd: () => {
      // A real source failure must reach Idle and advance, rather than keep
      // waiting for a loop preload of the same unavailable track forever.
      if (activeSource.failed) return false;
      if (!state.smoothMode) return false;
      if (state.queue[0] && !canSmooth(state.queue[0])) return false;
      if (state.preloadExcluded) return false;
      const pending =
        state.prepareTask ||
        state.prepared ||
        state.queue.length ||
        state.randomMode ||
        state.loopMode;
      if (pending) void prepareNext(guildId, state);
      return !!pending;
    },
  });
  state.mixer = mixer;
  mixer.setActive(source, track);
  const resource = createAudioResource(mixer, {
    inputType: StreamType.Raw,
    silencePaddingFrames: 0,
  });
  return {
    resource,
    get failed() {
      return activeSource.failed;
    },
    setSmooth: (enabled) => {
      mixer.smooth = enabled;
    },
    stop: () => {
      mixer.destroy();
      resource.playStream.destroy();
      if (state.mixer === mixer) state.mixer = null;
    },
  };
}
function ensureContinuous(guildId, state) {
  if (
    state.mixer ||
    !canSmooth(state.current) ||
    !state.current ||
    state.radio ||
    !state.stream?.takePcm ||
    state.player.state.status !== AudioPlayerStatus.Playing
  )
    return;
  // One migration when enabling the mode; subsequent changes reuse this resource.
  const elapsed =
    (state.stream.resource.playbackDuration || 0) - (state.trackStartedAtResourceMs || 0);
  const source = state.stream.takePcm();
  state.stream = continuousStream(guildId, state, source, state.current);
  state.trackStartedAtResourceMs = -elapsed;
  state.player.play(state.stream.resource);
}
function cancelFade(state) {
  clearInterval(state.fadeTimer);
  state.fadeTimer = null;
  state.stream?.resource.volume?.setVolume(1);
}
function preparedMatches(guildId, state, item) {
  if (!item || item.stream.failed || !state.smoothMode) return false;
  const expected =
    state.current && state.loopMode && state.loopMode !== 'queue' && !state.bypassLoop
      ? state.current
      : state.queue[0];
  if (expected) return expected.url === item.track.url;
  if (state.current && state.loopMode === 'queue' && !state.queue.length)
    return !state.randomMode && state.current.url === item.track.url;
  return (
    item.random &&
    state.randomMode &&
    item.genre === state.randomGenre &&
    item.source === getMusicSource(guildId)
  );
}
async function prepareNext(guildId, state) {
  if (!state.smoothMode || !canSmooth(state.current) || state.radio) return;
  if (state.prepareTask || state.prepared || Date.now() < state.prepareRetryAt) return;
  const current = state.current;
  const generation = state.generation;
  const abort = new AbortController();
  state.prepareAbort = abort;
  let stream;
  const task = (async () => {
    try {
      const repeat = state.loopMode && state.loopMode !== 'queue' && !state.bypassLoop;
      let track = repeat ? current : state.queue[0];
      const random = !track && state.randomMode;
      const source = getMusicSource(guildId),
        genre = state.randomGenre;
      if (random)
        track = await resolveRandomTrack([...state.randomHistory, current.url], source, {
          guildId,
          signal: abort.signal,
          genre,
        });
      if (!track && state.loopMode === 'queue' && !state.randomMode) track = current;
      if (!track || abort.signal.aborted) return;
      await hydrateTrack(track, { signal: abort.signal });
      if (abort.signal.aborted) return;
      if (!canSmooth(track)) {
        state.preloadExcluded = true;
        if (random && state.queue.length < 500) state.queue.push(track);
        return;
      }
      state.preloadExcluded = false;
      let media;
      try {
        media = await cacheTrackAudio(track, { signal: abort.signal });
      } catch (error) {
        if (abort.signal.aborted || error.message !== 'PRELOAD_TOO_LARGE') throw error;
        console.warn('[music] track exceeds RAM cache limit; preparing bounded stream');
      }
      if (abort.signal.aborted) return;
      stream = createTrackResource(track, { pcmOnly: true, media });
      await resourceReady(stream, abort.signal);
      const item = { track, stream, random, source, genre };
      // EOF can arrive while extraction is running. Keep this result only if it
      // still matches the queue/current identity and the original generation.
      if (
        players.get(guildId) !== state ||
        state.generation !== generation ||
        abort.signal.aborted ||
        (state.current && state.current !== current) ||
        !preparedMatches(guildId, state, item)
      ) {
        stream.stop();
        return;
      }
      state.prepared = item;
      state.mixer?.setNext(stream, track);
      console.log(
        '[music] next track prepared:',
        track.title,
        media ? `fully cached ${media.length} bytes` : 'bounded stream',
      );
    } catch (error) {
      stream?.stop();
      if (!abort.signal.aborted) {
        state.prepareRetryAt = Date.now() + 10000;
        console.warn('[music] preload unavailable:', error.message);
      }
    }
  })();
  state.prepareTask = task;
  try {
    await task;
  } finally {
    if (state.prepareTask === task) state.prepareTask = null;
    if (state.prepareAbort === abort) state.prepareAbort = null;
  }
}
function watchTransition(guildId, state) {
  clearInterval(state.transitionTimer);
  if (!state.smoothMode) return;
  state.transitionTimer = setInterval(() => {
    if (players.get(guildId) !== state || !state.smoothMode || state.radio || !state.current)
      return;
    if (state.prepared && !preparedMatches(guildId, state, state.prepared)) clearPrepared(state);
    if (state.player.state.status !== AudioPlayerStatus.Playing) return;
    const elapsed = (state.stream?.resource.playbackDuration || 0) / 1000;
    // Prepare one successor shortly after playback starts, including for Skip.
    // Its output remains bounded by the voice stream's backpressure.
    if (elapsed >= 1) void prepareNext(guildId, state);
  }, 1000);
  state.transitionTimer.unref?.();
}
export function applySmoothMode(guildId, enabled) {
  const state = players.get(guildId);
  if (!state) return;
  state.smoothMode = !!enabled;
  state.stream?.setSmooth?.(state.smoothMode);
  if (!enabled) {
    clearPrepared(state);
    cancelFade(state);
  }
  if (enabled) {
    ensureContinuous(guildId, state);
    void prepareNext(guildId, state);
  }
  watchTransition(guildId, state);
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
export function updateStandby(guildId, state) {
  clearTimeout(state.standbyTimer);
  if (
    !state.standby ||
    state.current ||
    state.radio ||
    state.randomMode ||
    state.loadingNext ||
    state.queue.length
  )
    return;
  state.standbyTimer = setTimeout(
    () => {
      if (
        players.get(guildId) === state &&
        !state.current &&
        !state.radio &&
        !state.randomMode &&
        !state.queue.length
      )
        destroyPlayer(guildId);
    },
    5 * 60 * 1000,
  );
  state.standbyTimer.unref();
}
export async function joinStandby(guildId, voiceChannel) {
  const state = getState(guildId);
  ensureConnection(guildId, voiceChannel, state);
  state.standby = true;
  try {
    await entersState(state.connection, VoiceConnectionStatus.Ready, 20000);
  } catch (error) {
    destroyPlayer(guildId);
    throw error;
  }
  updateStandby(guildId, state);
  musicChanged(guildId);
  return state;
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
    if (state.smoothMode && state.prepareTask) await state.prepareTask;
    if (players.get(guildId) !== state || state.generation !== generation) return;
    let prepared = state.prepared;
    if (!preparedMatches(guildId, state, prepared)) {
      clearPrepared(state);
      prepared = null;
    } else state.prepared = null;
    let track = state.queue.shift() || prepared?.track || null;
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
    await hydrateTrack(track, { signal: abort.signal });
    if (players.get(guildId) !== state || state.generation !== generation) return;
    state.current = track;
    state.preloadExcluded = false;
    state.bypassLoop = false;
    state.trackStartedAtResourceMs = 0;
    musicChanged(guildId);
    if (state.randomMode) {
      state.randomHistory.push(track.url);
      if (state.randomHistory.length > 80) state.randomHistory.shift();
    }
    const usePrepared = prepared && prepared.track.url === track.url;
    if (prepared && !usePrepared) prepared.stream.stop();
    const source = await openTrackSource(track, {
      signal: abort.signal,
      pcmOnly: state.smoothMode && canSmooth(track),
      prepared: usePrepared ? prepared.stream : null,
    });
    if (players.get(guildId) !== state || state.generation !== generation) {
      source.stop();
      return;
    }
    state.stream = source.pcm ? continuousStream(guildId, state, source, track) : source;
    state.player.play(state.stream.resource);
    state.lastTrack = track;
    musicChanged(guildId, track);
    watchTransition(guildId, state);
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
    updateStandby(guildId, state);
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
    clearPrepared(state);
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.randomMode = !!state.suspendedMusic?.randomMode;
    state.suspendedMusic = null;
    state.loopMode = getLoopMode(guildId) === 'off' ? false : getLoopMode(guildId);
    state.player.stop(true);
  }
  const result = insertTracks(state.queue, tracks, options);
  state.preloadExcluded = false;
  if (state.prepareTask || (state.prepared && !preparedMatches(guildId, state, state.prepared)))
    clearPrepared(state);
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
  if (state.prepareTask || (state.prepared && !preparedMatches(guildId, state, state.prepared)))
    clearPrepared(state);
  state.preloadExcluded = false;
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
  state.preloadExcluded = false;
  state.prepareRetryAt = 0;
  clearPrepared(state);
  if (state.radio) {
    state.stream?.stop();
    state.stream = null;
    state.radio = null;
    state.randomMode = !!state.suspendedMusic?.randomMode;
    state.suspendedMusic = null;
    state.loopMode = getLoopMode(guildId) === 'off' ? false : getLoopMode(guildId);
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
  clearPrepared(state);
  if (state.loadingNext && !state.current) {
    state.generation++;
    state.searchAbort?.abort();
  }
  if (!state.queue.length) clearTimeout(state.nextTimer);
  musicChanged(guildId, state.lastTrack);
  return true;
}
export async function playRadio(
  guildId,
  voiceChannel,
  station,
  { valid = () => true, requestedVersion = musicRequestVersion(guildId) } = {},
) {
  if (requestedVersion !== musicRequestVersion(guildId) || !valid())
    throw new Error('RADIO_CANCELLED');
  const state = getState(guildId);
  const generation = state.generation;
  state.radioPrepareAbort?.abort();
  const abort = new AbortController();
  state.radioPrepareAbort = abort;
  const prepared = createRadioResource(station);
  try {
    await resourceReady(prepared, abort.signal, 25000);
    if (
      abort.signal.aborted ||
      requestedVersion !== musicRequestVersion(guildId) ||
      players.get(guildId) !== state ||
      state.generation !== generation ||
      !valid()
    )
      throw new Error('RADIO_CANCELLED');
    ensureConnection(guildId, voiceChannel, state);
    invalidateMusicRequests(guildId);
    state.generation++;
    state.searchAbort?.abort();
    clearPrepared(state, true);
    cancelFade(state);
    clearInterval(state.transitionTimer);
    clearTimeout(state.nextTimer);
    clearTimeout(state.startupTimer);
    clearTimeout(state.radioTimer);
    if (!state.radio) {
      state.suspendedMusic = {
        randomMode: state.randomMode,
        loopMode: state.loopMode,
      };
      // A returning interrupted song starts from its beginning; audio is not retained.
      if (state.current && state.queue.length < 500) state.queue.unshift(state.current);
    }
    const previous = state.stream;
    state.randomMode = false;
    state.current = null;
    state.loopMode = false;
    state.bypassLoop = false;
    state.radio = station;
    state.radioRetries = 0;
    state.lastTrack = { title: t('วิทยุสด · {0}', station.name), duration: 0 };
    state.stream = prepared;
    state.player.play(prepared.resource);
    previous?.stop();
    musicChanged(guildId, state.lastTrack);
  } catch (error) {
    if (state.stream !== prepared) prepared.stop();
    throw error;
  } finally {
    if (state.radioPrepareAbort === abort) state.radioPrepareAbort = null;
  }
  return state;
}
export async function returnToMusic(guildId) {
  const state = players.get(guildId);
  if (!state?.radio && !state?.suspendedMusic) return false;
  state.generation++;
  state.radioPrepareAbort?.abort();
  clearTimeout(state.radioTimer);
  const saved = state.suspendedMusic;
  state.radio = null;
  state.suspendedMusic = null;
  state.randomMode = !!saved?.randomMode;
  state.loopMode = getLoopMode(guildId) === 'off' ? false : getLoopMode(guildId);
  state.stream?.stop();
  state.stream = null;
  state.player.stop(true);
  musicChanged(guildId, state.lastTrack);
  await playNext(guildId);
  return true;
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
  if (!state) return false;
  if (state.loadingNext && !state.stream) {
    // The selected track has not started. Cancel it rather than wait for extraction.
    state.generation++;
    state.searchAbort?.abort();
    clearPrepared(state, true);
    state.current = null;
    clearTimeout(state.startupTimer);
    musicChanged(guildId, state.lastTrack);
    return true; // playNext's finally advances remaining queued requests after cancellation.
  }
  if (!state.current) return false;
  // Skip the current song repeat only when there is another destination.
  // With a one-song loop, Skip restarts the song rather than silently stopping.
  state.bypassLoop = !!(state.queue.length || state.randomMode);
  if (['paused', 'autopaused'].includes(state.player.state.status)) state.player.unpause();
  if (
    state.mixer &&
    state.smoothMode &&
    !state.preloadExcluded &&
    (!state.queue[0] || canSmooth(state.queue[0]))
  ) {
    if (!state.queue.length && !state.randomMode && !state.loopMode) {
      clearPrepared(state);
      state.mixer.requestFinish();
      return true;
    }
    if (state.prepared && preparedMatches(guildId, state, state.prepared)) {
      state.mixer.requestSkip();
      return true;
    }
    // Smooth is optional: never wait for a downloader after the user presses Skip.
    clearPrepared(state, true);
    state.preloadExcluded = true;
    state.mixer.requestFinish();
    return true;
  }
  if (state.prepared && !preparedMatches(guildId, state, state.prepared)) clearPrepared(state);
  clearPrepared(state, true);
  if (
    state.smoothMode &&
    canSmooth(state.current) &&
    state.stream?.resource.volume &&
    state.player.state.status === AudioPlayerStatus.Playing
  ) {
    if (state.fadeTimer) return true;
    const stream = state.stream,
      started = Date.now();
    state.fadeTimer = setInterval(() => {
      if (state.stream !== stream) {
        clearInterval(state.fadeTimer);
        state.fadeTimer = null;
        return;
      }
      const gain = Math.max(0, 1 - (Date.now() - started) / FADE_MS);
      stream.resource.volume.setVolume(gain);
      if (gain === 0) {
        clearInterval(state.fadeTimer);
        state.fadeTimer = null;
        stream.stop();
        state.player.stop(true);
      }
    }, 25);
    state.fadeTimer.unref?.();
  } else {
    state.stream?.stop();
    state.player.stop(true);
  }
  return true;
}
export function toggleLoop(guildId) {
  const state = players.get(guildId);
  if (!state?.current || state.radio) return null;
  state.loopMode = state.loopMode === 'queue' ? false : state.loopMode ? 'queue' : 'track';
  clearPrepared(state);
  musicChanged(guildId, state.lastTrack);
  void saveLoopMode(guildId, state.loopMode || 'off').catch((error) =>
    console.warn('[loop]', error.message),
  );
  return state.loopMode;
}
export function setLoop(guildId, mode) {
  const state = players.get(guildId);
  if (!state || state.radio || !['off', 'track', 'queue'].includes(mode)) return null;
  state.loopMode = mode === 'off' ? false : mode;
  clearPrepared(state);
  musicChanged(guildId, state.lastTrack);
  void saveLoopMode(guildId, mode).catch((error) => console.warn('[loop]', error.message));
  return mode;
}
export function stop(guildId) {
  invalidateMusicRequests(guildId);
  const state = players.get(guildId);
  if (!state) return;
  state.generation++;
  state.radioPrepareAbort?.abort();
  state.radioPrepareAbort = null;
  state.suspendedMusic = null;
  clearPrepared(state, true);
  cancelFade(state);
  clearInterval(state.transitionTimer);
  state.searchAbort?.abort();
  clearTimeout(state.nextTimer);
  clearTimeout(state.startupTimer);
  clearTimeout(state.radioTimer);
  state.randomMode = false;
  state.loopMode = getLoopMode(guildId) === 'off' ? false : getLoopMode(guildId);
  state.bypassLoop = false;
  state.radio = null;
  state.queue.length = 0;
  state.current = null;
  state.stream?.stop();
  state.stream = null;
  state.player.stop(true);
  clearRandomSession(guildId);
  musicChanged(guildId, state.lastTrack);
  updateStandby(guildId, state);
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
  clearTimeout(state.standbyTimer);
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
