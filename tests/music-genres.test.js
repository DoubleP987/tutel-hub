import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomGenres, randomGenre } from '../src/music/genres.js';
import { commands } from '../src/commands/definitions.js';

test('Genre is an optional Discord choice with 25 unique options', () => {
  const option = commands.find((command) => command.name === 'randommusic').options[0];
  assert.equal(option.name, 'genre');
  assert.notEqual(option.required, true);
  assert.equal(option.choices.length, 25);
  assert.equal(new Set(option.choices.map((choice) => choice.value)).size, 25);
  for (const value of ['all', 'anime', 'russian', 'hiphop', 'lofi'])
    assert(option.choices.some((choice) => choice.value === value));
  assert.equal(randomGenre('unknown').value, 'all');
});
test('Every selected genre has varied single-track queries', () => {
  for (const genre of randomGenres.slice(1)) {
    assert.equal(genre.searches.length, 6);
    assert.equal(new Set(genre.searches.map((x) => x[1])).size, 6);
  }
});
test('Selected random genre constrains queries and retains short/long/live filtering', async () => {
  const queries = [];
  const context = {
    console,
    Date,
    Map,
    Set,
    Math,
    randomGenre,
    randomGenres,
    searchTracks: async (query) => {
      queries.push(query);
      return [
        { title: 'full album', duration: 500, url: 'https://example.test/album' },
        { title: 'short', duration: 20, url: 'https://example.test/short' },
        { title: 'live', live: true, duration: 200, url: 'https://example.test/live' },
        {
          title: 'Anime opening single',
          duration: 220,
          artist: 'Artist A',
          url: 'https://example.test/song',
        },
      ];
    },
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/random.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  const track = await context.resolveRandomTrack([], 'youtube', {
    guildId: 'test',
    genre: 'anime',
  });
  assert.equal(track.title, 'Anime opening single');
  assert(queries.every((query) => /anime|anisong/.test(query)));
});
