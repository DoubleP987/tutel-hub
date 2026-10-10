import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { calendarEnabled } from '../src/commands/calendar-visibility.js';
import { RADIO_STATIONS, stationFrequency, radioCategory } from '../src/music/radio-directory.js';
import { redactLog, appendLog, botLogs } from '../src/bot/logs.js';

test('Calendar requires a configured channel and enabled notifications', () => {
  assert.equal(calendarEnabled(null, { enabled: true }), false);
  assert.equal(calendarEnabled({ channel_id: null }, { enabled: true }), false);
  assert.equal(calendarEnabled({ channel_id: '123' }, { enabled: false }), false);
  assert.equal(calendarEnabled({ channel_id: '123' }, { enabled: true }), true);
});
test('Radio catalog contains music, news, education and local stations', () => {
  assert(RADIO_STATIONS.length >= 20);

  for (const category of ['music', 'news', 'talk', 'local']) {
    assert(RADIO_STATIONS.some((station) => radioCategory(station) === category));
  }

  assert.equal(stationFrequency({ name: 'FM 100.5 MHz MCOT news' }), '100.5');
  assert.equal(stationFrequency({ name: 'NBT AM 891' }), '');
});
test('Panel logs redact environment credentials and interaction tokens', () => {
  process.env.TEST_SECRET = 'synthetic-sensitive-value';

  try {
    const result = redactLog(
      'synthetic-sensitive-value /interactions/123/private-token/callback ' +
        'mongodb+srv://' +
        'user:pass@example.test password=hidden',
    );

    for (const value of ['synthetic-sensitive-value', 'private-token', 'user:pass', 'hidden']) {
      assert(!result.includes(value));
    }
  } finally {
    delete process.env.TEST_SECRET;
  }
});
test('Panel log history and text lengths are bounded', () => {
  for (let i = 0; i < 550; i++) {
    appendLog('info', 'x'.repeat(2500));
  }

  const result = botLogs();
  assert.equal(result.entries.length, 200);
  assert(result.entries.every((entry) => entry.text.length <= 2000));
  assert.equal(botLogs(result.latest).entries.length, 0);
});
test('Restored account theme persists for the next login without an update loop', () => {
  const storage = new Map();
  const document = {
    documentElement: { dataset: {} },
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {},
  };
  const window = {
    addEventListener() {},
    dispatchEvent() {
      throw new Error('Restoring account preferences must not trigger another save');
    },
  };
  const context = {
    document,
    window,
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  vm.createContext(context);
  vm.runInContext(
    readFileSync(new URL('../src/web/public/preferences.js', import.meta.url), 'utf8'),
    context,
  );
  window.TutelPrefs.set({ theme: 'dark' });
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(JSON.parse(storage.get('tutel.display.v1')).theme, 'dark');
});
