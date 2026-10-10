import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { genreMenuRows } from '../src/music/genre-menu.js';
import { randomGenres } from '../src/music/genres.js';
import { commands } from '../src/commands/definitions.js';

test('Music genre menus include all 25 categories in one dropdown', () => {
  const rows = genreMenuRows('user', 'panel').map((row) => row.toJSON());
  const options = rows[0].components[0].options;
  assert.equal(options.length, randomGenres.length);
  assert.equal(new Set(options.map((option) => option.value)).size, 25);
  assert.equal(options.length, 25);
  assert.equal(rows.length, 1);
  assert(options.some((option) => option.value === 'all'));
  assert(options.some((option) => option.value === 'jpop'));
  assert(!options.some((option) => option.value === 'anime'));
  assert(rows.every((row) => row.components[0].custom_id.includes('user:panel')));
  assert(commands.some((command) => command.name === 'join'));
});

test('Standby leaves after exactly five idle minutes and cancels while music is active', () => {
  const timers = [];
  const context = {
    Map,
    Set,
    console,
    clearTimeout: (timer) => {
      if (timer) {
        timer.cancelled = true;
      }
    },
    setTimeout: (callback, delay) => {
      const timer = { callback, delay, unref() {} };
      timers.push(timer);
      return timer;
    },
    destroyed: 0,
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/player.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  vm.runInContext('destroyPlayer = () => { destroyed++; };', context);
  const state = {
    standby: true,
    current: null,
    radio: null,
    randomMode: false,
    loadingNext: false,
    queue: [],
  };
  context.state = state;
  vm.runInContext("players.set('test', state)", context);
  context.updateStandby('test', state);
  assert.equal(timers[0].delay, 300000);
  timers[0].callback();
  assert.equal(context.destroyed, 1);
  state.current = { title: 'Playing' };
  context.updateStandby('test', state);
  assert.equal(timers[0].cancelled, true);
  assert.equal(timers.length, 1);
});
