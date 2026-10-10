export const MAX_QUEUE_TRACKS = 500;

export function insertTracks(queue, tracks, { next = false } = {}) {
  const accepted = tracks.slice(0, Math.max(0, MAX_QUEUE_TRACKS - queue.length));

  if (!accepted.length) {
    throw new Error('QUEUE_FULL');
  }

  if (next) {
    queue.unshift(...accepted);
  } else {
    queue.push(...accepted);
  }

  return { added: accepted.length, omitted: tracks.length - accepted.length };
}

export function removeTrack(queue, position) {
  if (!Number.isInteger(position) || position < 1 || position > queue.length) {
    return null;
  }

  return queue.splice(position - 1, 1)[0];
}

export function moveTrack(queue, from, to) {
  if (![from, to].every((p) => Number.isInteger(p) && p >= 1 && p <= queue.length)) {
    return false;
  }

  queue.splice(to - 1, 0, queue.splice(from - 1, 1)[0]);
  return true;
}

export function shuffleTracks(queue, random = Math.random) {
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
}

export function repeatFinishedTrack(state, played) {
  // Unavailable streams must never be put back into a looping queue.
  if (!played || !state.current || state.queue.length >= MAX_QUEUE_TRACKS) {
    return;
  }

  if (state.loopMode === 'queue' && !state.randomMode) {
    state.queue.push(state.current);
  } else if (state.bypassLoop) {
    return;
  } else if (state.loopMode && state.loopMode !== 'queue') {
    state.queue.unshift(state.current);
  }
}
