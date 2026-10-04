import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { readFileSync } from 'node:fs';

function fixture() {
  const child = new EventEmitter();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
  };
  let args;
  const context = {
    console: { log() {}, error() {}, warn() {} },
    setTimeout,
    clearTimeout,
    process: { stderr: { write() {} } },
    ffmpegPath: '/usr/bin/ffmpeg',
    ytDlpPath: 'yt-dlp',
    StreamType: { Raw: 'raw' },
    createAudioResource: (stream, options) => ({
      stream,
      playStream: new PassThrough(),
      ...options,
    }),
    spawn: (path, options) => {
      assert.equal(path, '/usr/bin/ffmpeg');
      args = options;
      return child;
    },
  };
  vm.createContext(context);
  const source = readFileSync(new URL('../src/music/stream.js', import.meta.url), 'utf8')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\s*/gm, '')
    .replace(/export /g, '');
  vm.runInContext(source, context);
  return { child, context, args: () => args };
}

test('Radio streams use the selected FFmpeg and bounded network timeout', () => {
  const fixtureState = fixture();
  const stream = fixtureState.context.createRadioResource({ url: 'https://station.test/live' });
  assert.equal(stream.resource.inputType, 'raw');
  assert(fixtureState.args().includes('-rw_timeout'));
  assert.equal(stream.failed, false);
  stream.stop();
  stream.stop();
  assert.equal(fixtureState.child.killed, true);
});

test('Radio decoder crashes and spawn errors are recorded as failures', () => {
  for (const errorType of ['signal', 'spawn']) {
    const fixtureState = fixture();
    const stream = fixtureState.context.createRadioResource({ url: 'https://station.test/live' });
    if (errorType === 'signal') fixtureState.child.emit('close', null, 'SIGSEGV');
    else fixtureState.child.emit('error', new Error('ENOENT'));
    assert.equal(stream.failed, true);
  }
});
