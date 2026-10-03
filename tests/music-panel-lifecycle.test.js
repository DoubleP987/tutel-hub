import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import * as discord from 'discord.js';
import { genreMenuRows } from '../src/music/genre-menu.js';

test('A new play moves the panel; leave and restart remove it', async () => {
  const settings = new Map(),
    messages = new Map(),
    deleted = [];
  let id = 0;
  const channel = {
    isSendable: () => true,
    messages: {
      fetch: async (messageId) => {
        if (!messages.has(messageId)) throw Object.assign(new Error('Missing'), { code: 10008 });
        return messages.get(messageId);
      },
    },
    send: async () => {
      const messageId = String(++id);
      const message = {
        id: messageId,
        edit: async () => {},
        delete: async () => {
          deleted.push(messageId);
          messages.delete(messageId);
        },
      };
      messages.set(messageId, message);
      return message;
    },
  };
  const events = new EventEmitter();
  const state = {
    connection: {},
    player: { state: { status: 'playing' } },
    queue: [],
    current: { title: 'Track', duration: 120 },
  };
  const context = {
    ...discord,
    console,
    URL,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    t: (text, ...values) => text.replace(/\{(\d+)\}/g, (_, index) => String(values[index])),
    data: { findMany: async () => [] },
    setting: (key) => settings.get(key),
    setSetting: async (key, value) => settings.set(key, value),
    getPlayer: () => state,
    getMusicSource: () => 'youtube',
    musicSourceLabel: () => 'YouTube',
    musicEvents: events,
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/panel.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  const client = {
    isReady: () => true,
    guilds: { cache: new Map([['guild', {}]]) },
    channels: { fetch: async () => channel },
  };
  try {
    await context.initializeMusicPanels(client);
    const request = { guildId: 'guild', channelId: 'channel', channel };
    await context.ensureMusicPanel(request);
    assert.equal(messages.size, 1);
    await context.ensureMusicPanel(request);
    assert.deepEqual(deleted, ['1']);
    assert.equal(messages.size, 1);
    assert.equal(JSON.parse(settings.get('music_panel:guild')).messageId, '2');
    events.emit('leave', 'guild');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(messages.size, 0);
    assert.equal(settings.get('music_panel:guild'), 'null');
    await context.ensureMusicPanel(request);
    await context.stopMusicPanels();
    assert.equal(messages.size, 0);
  } finally {
    await context.stopMusicPanels();
  }
});

test('Enable random opens the private genre menu before starting playback', async () => {
  const context = {
    ...discord,
    setting: () => JSON.stringify({ messageId: 'panel', channelId: 'channel' }),
    getPlayer: () => ({ randomMode: false }),
    genreMenuRows,
    t: (text) => text,
    enableRandomMode: () => assert.fail('Playback must wait for genre selection'),
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/panel.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  let reply;
  await context.handleMusicPanelInteraction({
    customId: 'music:control:random',
    guildId: 'guild',
    user: { id: 'user' },
    message: { id: 'panel' },
    inGuild: () => true,
    isModalSubmit: () => false,
    reply: async (body) => {
      reply = body;
    },
  });
  assert.equal(reply.flags, discord.MessageFlags.Ephemeral);
  assert.equal(reply.components.length, 1);
  assert.equal(reply.components[0].toJSON().components[0].options.length, 25);
  assert(!source.includes("button('genre',"));
});
