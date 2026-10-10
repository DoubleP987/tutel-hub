import { ContinuousPcm } from '../src/music/continuous-pcm.js';
import { PassThrough } from 'node:stream';
import { once } from 'node:events';
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const code = readFileSync(new URL('../src/music/startup.js', import.meta.url), 'utf8')
  .slice(
    readFileSync(new URL('../src/music/startup.js', import.meta.url), 'utf8').indexOf(
      'export async function',
    ),
  )
  .replace('export async function', 'async function');

function startup({ fail = 0, abort } = {}) {
  const sources = [];
  const options = [];
  const context = {
    createTrackResource(track, config) {
      const source = {
        failed: false,
        stopped: false,
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      options.push(config);
      return source;
    },
    async resourceReady() {
      abort?.abort();

      if (fail-- > 0) {
        throw new Error('HTTP 403 / empty PCM');
      }
    },
    console: { warn() {} },
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { open: context.openTrackSource, sources, options };
}

test('First queued song retries an empty initial extraction without requiring another /play', async () => {
  const run = startup({ fail: 1 });
  const stream = await run.open(
    { url: 'youtube', title: 'first' },
    { signal: new AbortController().signal, pcmOnly: true },
  );
  assert.equal(run.sources.length, 2);
  assert.equal(run.sources[0].stopped, true);
  assert.equal(stream, run.sources[1]);
  assert.equal(run.options[1].format, 'bestaudio[ext=m4a]/bestaudio/best');
});
test('Startup has a bounded retry and releases both failed sources', async () => {
  const run = startup({ fail: 3 });
  await assert.rejects(run.open({}, { signal: new AbortController().signal }), /HTTP 403/);
  assert.equal(run.sources.length, 2);
  assert.ok(run.sources.every((source) => source.stopped));
});
test('Stop during startup cancels instead of playing or retrying the stopped request', async () => {
  const abort = new AbortController();
  const run = startup({ abort });
  await assert.rejects(run.open({}, { signal: abort.signal }));
  assert.equal(run.sources.length, 1);
  assert.equal(run.sources[0].stopped, true);
});
test('A healthy prefetched loop resource is reused without a second download', async () => {
  const run = startup();
  const prepared = { failed: false };
  assert.equal(await run.open({}, { signal: new AbortController().signal, prepared }), prepared);
  assert.equal(run.sources.length, 0);
});
const panel = readFileSync(new URL('../src/music/panel.js', import.meta.url), 'utf8');
test('Final playback history contains no latest-action field or active buttons', () => {
  const archive = panel.slice(
    panel.indexOf('async function archivePanel('),
    panel.indexOf('function onMusicLeave('),
  );
  assert.ok(!archive.includes('music_action:'));
  assert.ok(archive.includes('record.history'));
  assert.ok(archive.includes('components: []'));
});

test('Skip finish ends a stalled PCM source without waiting for new audio', async () => {
  const pcm = new PassThrough();
  let stopped = false;
  const mixer = new ContinuousPcm({ onSwitch() {}, onEnd: () => true });
  mixer.setActive(
    {
      pcm,
      stop() {
        stopped = true;
        pcm.destroy();
      },
    },
    { title: 'stalled' },
  );
  const ended = once(mixer, 'end');
  mixer.requestFinish();
  mixer.resume();
  await ended;
  assert.equal(stopped, true);
});
