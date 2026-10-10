import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { EventEmitter } from 'node:events';
import { PassThrough, Readable } from 'node:stream';
import { repeatFinishedTrack } from '../src/music/queue.js';

const source = readFileSync(new URL('../src/music/player.js', import.meta.url), 'utf8');
const skipCode = source
  .slice(source.indexOf('export function skip('), source.indexOf('export function toggleLoop('))
  .replace('export function', 'function');

function skipState({ mode, queue = [], smooth = true }) {
  const calls = [];
  let fallback;
  const state = {
    current: { url: 'a', duration: 200 },
    queue,
    loopMode: mode,
    randomMode: false,
    smoothMode: smooth,
    prepared: { track: { url: 'a' } },
    prepareTask: null,
    preloadExcluded: false,
    stream: {
      stop() {
        calls.push('stopStream');
      },
    },
    player: {
      stop() {
        calls.push('stopPlayer');
      },
      state: { status: 'playing' },
    },
    mixer: smooth
      ? {
          requestSkip() {
            calls.push('skip');
          },
          requestFinish() {
            calls.push('finish');
          },
          requestFinish() {
            calls.push('finish');
          },
        }
      : null,
  };
  const context = {
    players: new Map([['guild', state]]),
    canSmooth: () => true,
    preparedMatches: () => true,
    clearPrepared() {
      state.prepared = null;
    },
    prepareNext() {},
    AudioPlayerStatus: { Playing: 'playing' },
    setInterval,
    clearInterval,
    setTimeout: (callback) => {
      fallback = callback;
      return { unref() {} };
    },
    clearTimeout,
    Date,
    FADE_MS: 350,
  };
  vm.createContext(context);
  vm.runInContext(skipCode, context);
  assert.equal(context.skip('guild'), true);
  return { state, calls, expireSkip: () => fallback?.() };
}

test('Skip retains a single-song loop and requests a transition instead of finish', () => {
  const { state, calls } = skipState({ mode: 'track' });
  assert.equal(state.bypassLoop, false);
  assert.deepEqual(calls, ['skip']);
});
test('Skip bypasses song repeat when a different queued track exists', () => {
  const { state, calls } = skipState({ mode: 'track', queue: [{ url: 'b' }] });
  assert.equal(state.bypassLoop, true);
  assert.deepEqual(calls, ['skip']);
  const length = state.queue.length;
  repeatFinishedTrack(state, true);
  assert.equal(state.queue.length, length);
});
test('Skip preserves queue loop even when it contains only the current song', () => {
  const { state, calls } = skipState({ mode: 'queue' });
  assert.deepEqual(calls, ['skip']);
  repeatFinishedTrack(state, true);
  assert.equal(state.queue[0], state.current);
});
test('Skip with loop off and no successor finishes normally', () => {
  const { calls } = skipState({ mode: false });
  assert.deepEqual(calls, ['finish']);
});
test('Without smooth mode, Idle can restart the single loop after skip', () => {
  const { state, calls } = skipState({ mode: 'track', smooth: false });
  assert.deepEqual(calls, ['stopStream', 'stopPlayer']);
  repeatFinishedTrack(state, true);
  assert.equal(state.queue[0], state.current);
});

const streamSource = readFileSync(new URL('../src/music/stream.js', import.meta.url), 'utf8');
const resourceCode = streamSource
  .slice(
    streamSource.indexOf('export function createTrackResource('),
    streamSource.indexOf('export function createRadioResource('),
  )
  .replace('export function', 'function');

function decoder() {
  const children = [];
  const context = {
    Readable,
    console: { log() {}, warn() {}, error() {} },
    process: { stderr: { write() {} } },
    executable: 'downloader',
    ffmpegPath: 'ffmpeg',
    ytDlpRuntimeArgs: [],
    spawn() {
      const child = new EventEmitter();
      child.stdout = new PassThrough();
      child.stderr = new PassThrough();
      child.stdin = new PassThrough();

      child.kill = () => {
        child.emit('close', 255);
      };

      children.push(child);
      return child;
    },
  };
  vm.createContext(context);
  vm.runInContext(resourceCode, context);
  return {
    resource: context.createTrackResource(
      { title: 'synthetic', url: 'synthetic' },
      { pcmOnly: true },
    ),
    children,
  };
}

test('Intentional decoder stop does not mark a looping track failed', () => {
  const { resource } = decoder();
  resource.stop();
  assert.equal(resource.failed, false);
});
test('Real decoder failure still marks playback failed and is not recycled', () => {
  const { resource, children } = decoder();
  children[1].emit('close', 1);
  assert.equal(resource.failed, true);
  const state = { current: { url: 'bad' }, queue: [], loopMode: 'queue' };
  repeatFinishedTrack(state, !resource.failed);
  assert.equal(state.queue.length, 0);
});

test('A failed continuous source exits instead of waiting forever for its loop preload', () => {
  const code = source.slice(
    source.indexOf('function continuousStream('),
    source.indexOf('function ensureContinuous('),
  );
  let hooks;
  const state = { smoothMode: true, queue: [], loopMode: 'track' };
  const context = {
    ContinuousPcm: class {
      constructor(options) {
        hooks = options;
      }
      setActive() {}
    },
    createAudioResource: () => ({}),
    StreamType: { Raw: 'raw' },
    canSmooth: () => true,
    prepareNext() {
      throw new Error('Failed source must not preload itself forever');
    },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  context.continuousStream('guild', state, { failed: true }, { url: 'bad', duration: 200 });
  assert.equal(hooks.onEnd(), false);
});

test('Skip uses a ready successor without waiting for any downloader', () => {
  const run = skipState({ mode: false, queue: [{ url: 'next' }] });
  assert.deepEqual(run.calls, ['skip']);
});
test('Skip with only pending prefetch fades out immediately and cancels preparation', () => {
  const state = {
    current: { url: 'a', duration: 200 },
    queue: [{ url: 'b' }],
    randomMode: false,
    smoothMode: true,
    preloadExcluded: false,
    prepared: null,
    prepareTask: Promise.resolve(),
    player: { state: { status: 'playing' } },
    mixer: {
      requestFinish() {
        calls.push('finish');
      },
      requestSkip() {
        calls.push('skip');
      },
    },
  };
  const calls = [];
  const context = {
    players: new Map([['guild', state]]),
    canSmooth: () => true,
    clearPrepared: () => calls.push('cancel'),
    preparedMatches: () => false,
    prepareNext: () => assert.fail('Skip must not start or wait for a download'),
  };
  vm.createContext(context);
  vm.runInContext(skipCode, context);
  assert.equal(context.skip('guild'), true);
  assert.deepEqual(calls, ['cancel', 'finish']);
});
test('Skip cancels the currently loading song before audio has started', () => {
  let cancelled = false;
  const state = {
    loadingNext: true,
    stream: null,
    current: { url: 'loading' },
    generation: 1,
    searchAbort: {
      abort() {
        cancelled = true;
      },
    },
  };
  const context = {
    players: new Map([['guild', state]]),
    clearPrepared() {},
    clearTimeout() {},
    musicChanged() {},
  };
  vm.createContext(context);
  vm.runInContext(skipCode, context);
  assert.equal(context.skip('guild'), true);
  assert.equal(cancelled, true);
  assert.equal(state.generation, 2);
  assert.equal(state.current, null);
});
