import test from 'node:test';
import assert from 'node:assert/strict';
import { playbackStatus } from '../src/music/status.js';
test('Panel playback status distinguishes playback, pause, loading, standby and disconnected guilds', () => {
  const state = {
    connection: {},
    player: { state: { status: 'playing' } },
    current: { title: 'Song' },
  };
  assert.equal(playbackStatus(undefined), 'disconnected');
  assert.equal(playbackStatus(state), 'music');
  state.radio = { name: 'Station' };
  assert.equal(playbackStatus(state), 'radio');
  state.player.state.status = 'paused';
  assert.equal(playbackStatus(state), 'paused');
  state.player.state.status = 'autopaused';
  assert.equal(playbackStatus(state), 'paused');
  state.player.state.status = 'buffering';
  assert.equal(playbackStatus(state), 'loading');
  state.player.state.status = 'idle';
  assert.equal(playbackStatus(state), 'standby');
  state.loadingNext = true;
  assert.equal(playbackStatus(state), 'loading');
});
