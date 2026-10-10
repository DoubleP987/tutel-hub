import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { randomGenres, randomGenre, genreSuggestions } from '../src/music/genres.js';
import { handleMusicAutocomplete } from '../src/commands/music-autocomplete.js';
import { commands } from '../src/commands/definitions.js';

test('Genre is optional autocomplete with 25 unique genres', () => {
  const option = commands.find((command) => command.name === 'randommusic').options[0];
  assert.equal(option.name, 'genre');
  assert.notEqual(option.required, true);
  assert.equal(option.autocomplete, true);
  assert.equal(option.choices, undefined);
  assert.equal(randomGenres.length, 25);
  assert.equal(new Set(randomGenres.map((genre) => genre.value)).size, 25);

  for (const value of ['all', 'jpop', 'russian', 'hiphop', 'lofi', 'bass', 'meme']) {
    assert(randomGenres.some((genre) => genre.value === value));
  }

  assert.equal(randomGenre('unknown').value, 'all');
});

test('Bass aliases resolve to suggestions and all genres remain searchable', () => {
  assert.equal(genreSuggestions().length, 25);

  for (const query of ['เบส', 'bass', 'dubstep', 'phonk', 'dnb', 'hardstyle']) {
    assert(genreSuggestions(query).some((choice) => choice.value === 'bass'));
  }

  for (const genre of randomGenres) {
    assert(genreSuggestions(genre.value).some((choice) => choice.value === genre.value));
  }

  assert.deepEqual(genreSuggestions('unknown style'), []);
});

test('Autocomplete responds directly with genre suggestions', async () => {
  let response;
  await handleMusicAutocomplete({
    commandName: 'randommusic',
    options: { getFocused: () => ({ name: 'genre', value: 'เบส' }) },
    respond: async (choices) => {
      response = choices;
    },
  });
  assert.equal(response[0].value, 'bass');
  assert(response.length <= 25);
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
          title: 'Japanese pop single',
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
    genre: 'jpop',
  });
  assert.equal(track.title, 'Japanese pop single');
  assert(queries.every((query) => /jpop|japanese|jrock|city pop/i.test(query)));
});
