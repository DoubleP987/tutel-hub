import test from 'node:test';
import assert from 'node:assert/strict';
import { selectRequestedTrack } from '../src/music/selection.js';
const short = { title: 'Short clip', duration: 12 };
const song = { title: 'Full song', duration: 240 };
test('A short first search result does not hide a full song', () => {
  assert.equal(selectRequestedTrack([short, song]), song);
});
test('A direct short link preserves the requested track', () => {
  assert.equal(selectRequestedTrack([short, song], { direct: true }), short);
});
test('Short-only results are playable rather than unconditionally rejected', () => {
  assert.equal(selectRequestedTrack([short]), short);
});
test('Unknown duration remains playable and recorded/live preference is stable', () => {
  const unknown = { title: 'Unknown duration', duration: 0 };
  const live = { title: 'Live', duration: 0, live: true };
  assert.equal(selectRequestedTrack([live, unknown]), unknown);
  assert.equal(selectRequestedTrack([live]), live);
  assert.equal(selectRequestedTrack([]), null);
});
