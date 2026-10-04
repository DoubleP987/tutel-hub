import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import * as discord from 'discord.js';
import { musicLink } from '../src/music/links.js';
import { playlistTrack } from '../src/music/playlist.js';
import {
  insertTracks,
  moveTrack,
  removeTrack,
  shuffleTracks,
  repeatFinishedTrack,
} from '../src/music/queue.js';

test('YouTube links distinguish a track, playlist and mixed URL; provider hosts are exact', () => {
  for (const url of [
    'https://youtu.be/Rc2k_8skxtI',
    'https://www.youtube.com/watch?v=Rc2k_8skxtI',
    'https://m.youtube.com/shorts/Rc2k_8skxtI',
  ])
    assert.equal(musicLink(url).singleUrl, 'https://www.youtube.com/watch?v=Rc2k_8skxtI');
  assert.equal(musicLink('https://www.youtube.com/watch?v=Rc2k_8skxtI&list=PLtest').mixed, true);
  assert.equal(musicLink('https://youtube.com/playlist?list=PLtest').mixed, false);
  assert.equal(musicLink('https://soundcloud.com/artist/sets/test').playlist, true);
  assert.equal(musicLink('https://youtube.com.evil.test/watch?v=Rc2k_8skxtI').singleUrl, undefined);
});
test('Direct YouTube metadata hydrates duration and caches its fast oEmbed title', async () => {
  let calls = 0;
  const context = {
    Map,
    Date,
    String,
    URL,
    AbortSignal,
    hydrateTrack: async (track) => ({ ...track, duration: 250 }),
  };
  context.fetch = async () => {
    calls++;
    return { ok: true, json: async () => ({ title: 'Short requested track' }) };
  };
  vm.createContext(context);
  vm.runInContext(
    readFileSync(new URL('../src/music/links.js', import.meta.url), 'utf8')
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
      .replace(/export /g, ''),
    context,
  );
  const link = context.musicLink('https://youtu.be/Rc2k_8skxtI');
  const track = await context.youtubeTrack(link);
  assert.equal(track.title, 'Short requested track');
  assert.equal(track.duration, 250);
  await context.youtubeTrack(link);
  assert.equal(calls, 1);
});
test('Playlist entries preserve order and exclude inaccessible/deleted entries', () => {
  assert.equal(
    playlistTrack({ ie_key: 'Soundcloud', url: 'https://soundcloud.com/artist/my-song' }).title,
    'my song',
  );
  assert.equal(
    playlistTrack({ title: '[Private video]', url: 'https://youtube.com/watch?v=1' }),
    null,
  );
  assert.equal(
    playlistTrack({
      title: 'Restricted',
      availability: 'needs_auth',
      url: 'https://soundcloud.com/x/y',
    }),
    null,
  );
  assert.equal(
    playlistTrack({ title: 'Song', id: 'test-id', ie_key: 'Youtube' }).url,
    'https://www.youtube.com/watch?v=test-id',
  );
});
test('Queue edits preserve playlist order, current-track independence and limits', () => {
  const queue = [{ title: 'old' }];
  insertTracks(queue, [{ title: 'first' }, { title: 'second' }], { next: true });
  assert.deepEqual(
    queue.map((x) => x.title),
    ['first', 'second', 'old'],
  );
  assert.equal(moveTrack(queue, 3, 1), true);
  assert.equal(removeTrack(queue, 2).title, 'first');
  assert.equal(moveTrack(queue, 0, 1), false);
  assert.equal(removeTrack(queue, 50), null);
  const before = queue.slice();
  shuffleTracks(queue, () => 0);
  assert.deepEqual(new Set(queue), new Set(before));
  const full = Array.from({ length: 499 }, (_, id) => ({ id }));
  assert.equal(insertTracks(full, [{}, {}]).omitted, 1);
  assert.throws(() => insertTracks(full, [{}]), /QUEUE_FULL/);
});
test('Queue loop recycles skipped tracks; failed playback and song-loop skips do not repeat', () => {
  const state = {
    current: { title: 'a' },
    queue: [{ title: 'b' }],
    loopMode: 'queue',
    bypassLoop: false,
  };
  repeatFinishedTrack(state, false);
  assert.equal(state.queue.length, 1);
  repeatFinishedTrack(state, true);
  assert.equal(state.queue[1], state.current);
  state.bypassLoop = true;
  repeatFinishedTrack(state, true);
  assert.equal(state.queue.length, 3);
  state.bypassLoop = false;
  state.loopMode = 'track';
  repeatFinishedTrack(state, true);
  assert.equal(state.queue[0], state.current);
  state.bypassLoop = true;
  repeatFinishedTrack(state, true);
  assert.equal(state.queue.length, 4);
});

function playlistHarness(produce) {
  let killed = false,
    args;
  const context = {
    console,
    Buffer,
    Error,
    JSON,
    setTimeout,
    clearTimeout,
    ytDlpPath: 'fake-ytdlp',
    ytDlpRuntimeArgs: [],
    spawn: (_file, options) => {
      args = options;
      const child = new EventEmitter();
      child.stdout = new EventEmitter();
      child.stderr = new EventEmitter();
      child.stdout.setEncoding = child.stderr.setEncoding = () => {};
      child.kill = () => {
        killed = true;
        setImmediate(() => child.emit('close', null));
      };
      setImmediate(() => produce(child));
      return child;
    },
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/playlist.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  return {
    context,
    get killed() {
      return killed;
    },
    get args() {
      return args;
    },
  };
}
test('NDJSON playlist reader handles split chunks and final lines without downloading media', async () => {
  const h = playlistHarness((child) => {
    const a = JSON.stringify({ title: 'One', url: 'https://example.test/one' });
    child.stdout.emit('data', a.slice(0, 20));
    child.stdout.emit(
      'data',
      a.slice(20) + '\n' + JSON.stringify({ title: '[Private video]' }) + '\n',
    );
    child.stdout.emit('data', JSON.stringify({ title: 'Two', url: 'https://example.test/two' }));
    child.emit('close', 0);
  });
  const result = await h.context.readPlaylist('url');
  assert.equal(result.tracks.map((x) => x.title).join(','), 'One,Two');
  assert.equal(result.skipped, 1);
  for (const flag of ['--skip-download', '--flat-playlist', '--dump-json', '--ignore-config'])
    assert(h.args.includes(flag));
  assert.equal(h.args[h.args.indexOf('--playlist-end') + 1], '100');
});
test('Aborting the playlist reader kills the child process', async () => {
  const h = playlistHarness(() => {}),
    controller = new AbortController();
  const pending = h.context.readPlaylist('url', { signal: controller.signal });
  controller.abort();
  await assert.rejects(pending, /PLAYLIST_CANCELLED/);
  assert.equal(h.killed, true);
});

function requestHarness({ playlist = false, mixed = false, wait = false } = {}) {
  const events = new EventEmitter(),
    replies = [],
    added = [];
  let reads = 0,
    finish;
  const context = {
    ...discord,
    console,
    AbortController,
    setTimeout,
    clearTimeout,
    Date,
    randomUUID: () => 'test-job',
    t: (text, ...values) => text.replace(/\{(\d+)\}/g, (_, i) => values[i]),
    musicEvents: events,
    musicRequestVersion: () => 0,
    resolveMusicLink: async () => ({
      playlist,
      mixed,
      playlistUrl: 'https://youtube.com/playlist?list=test',
    }),
    readPlaylist: async (_url, options) => {
      reads++;
      options.onProgress({ found: 2, skipped: 1 });
      if (wait)
        await new Promise((resolve, reject) => {
          finish = resolve;
          options.signal.addEventListener('abort', () => reject(new Error('PLAYLIST_CANCELLED')), {
            once: true,
          });
        });
      return { tracks: [{ title: 'A' }, { title: 'B' }], skipped: 1, limited: false };
    },
    MAX_PLAYLIST_TRACKS: 100,
    resolveTrack: async () => ({ title: 'Single' }),
    enqueueMany: (_guild, _channel, tracks) => {
      added.push(...tracks);
      return { added: tracks.length, omitted: 0 };
    },
    getMusicSource: () => 'youtube',
    showMusicPanel: async () => {},
    musicPanelPending: () => {},
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/requests.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  const interaction = {
    guildId: 'guild',
    channelId: 'chat',
    user: { id: 'user' },
    member: { voice: { channel: { id: 'voice' } } },
    guild: { voiceStates: { cache: new Map([['user', { channelId: 'voice' }]]) } },
    deferReply: async () => {
      interaction.deferred = true;
    },
    editReply: async (value) => {
      replies.push(value);
    },
  };
  const button = (action) => ({
    isButton: () => true,
    customId: 'music:request:test-job:' + action,
    guildId: 'guild',
    channelId: 'chat',
    user: { id: 'user' },
    deferUpdate: async () => {},
    reply: async () => {},
  });
  return {
    context,
    interaction,
    replies,
    added,
    events,
    button,
    get reads() {
      return reads;
    },
    finish: () => finish?.(),
  };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
test('Playlist request queues the entire ordered list once and removes its buttons', async () => {
  const h = requestHarness({ playlist: true });
  await h.context.playRequest(h.interaction, { query: 'url' });
  assert.deepEqual(
    h.added.map((x) => x.title),
    ['A', 'B'],
  );
  assert.equal(h.replies.at(-1).components.length, 0);
});
test('Stop during playlist reading aborts without adding partial tracks', async () => {
  const h = requestHarness({ playlist: true, wait: true });
  const pending = h.context.playRequest(h.interaction, { query: 'url' });
  await tick();
  assert.equal(h.reads, 1);
  h.events.emit('cancel', 'guild');
  await pending;
  assert.equal(h.added.length, 0);
  assert.match(h.replies.at(-1).content, /ยกเลิก/);
});
test('Mixed URL waits for a choice; selecting one song does not read the playlist', async () => {
  const h = requestHarness({ playlist: true, mixed: true });
  const pending = h.context.playRequest(h.interaction, { query: 'url' });
  await tick();
  assert.equal(h.reads, 0);
  await h.context.handleMusicRequestButton(h.button('single'));
  await pending;
  assert.equal(h.reads, 0);
  assert.equal(h.added[0].title, 'Single');
});
test('Leaving voice while reading prevents a queue commit', async () => {
  const h = requestHarness({ playlist: true, wait: true });
  const pending = h.context.playRequest(h.interaction, { query: 'url' });
  await tick();
  h.interaction.guild.voiceStates.cache.clear();
  h.finish();
  await pending;
  assert.equal(h.added.length, 0);
});
