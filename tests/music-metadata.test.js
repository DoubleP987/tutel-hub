import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('Missing duration is hydrated once, cached and never fabricated for live or failed extraction', async () => {
  let calls = 0;
  const context = {
    Map,
    Date,
    Number,
    Object,
    AbortSignal,
    searchTracks: async () => {
      calls++;
      return [{ duration: 250, live: false, title: 'Ghost' }];
    },
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/metadata.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  const track = { url: 'https://youtube.com/watch?v=qguo-j5PxBE', duration: 0 };
  await context.hydrateTrack(track);
  assert.equal(track.duration, 250);
  await context.hydrateTrack({ url: track.url, duration: 0 });
  assert.equal(calls, 1);
  await context.hydrateTrack({ url: 'https://example.com/live', live: true, duration: 0 });
  assert.equal(calls, 1);
  context.searchTracks = async () => {
    throw new Error('unavailable');
  };
  const unknown = { url: 'https://example.com/song', duration: 0 };
  assert.equal(await context.hydrateTrack(unknown), unknown);
  assert.equal(unknown.duration, 0);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => context.hydrateTrack(track, { signal: controller.signal }));
});
