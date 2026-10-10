import { createTrackResource } from './stream.js';
import { resourceReady } from './transition.js';

// A temporary extraction failure must not silently discard the first queued song.
export async function openTrackSource(track, { signal, pcmOnly = false, prepared = null } = {}) {
  if (prepared && !prepared.failed) {
    return prepared;
  }

  let lastError;

  for (let attempt = 0; attempt < 2; attempt++) {
    signal.throwIfAborted();
    let source;

    try {
      source = createTrackResource(track, {
        pcmOnly,
        ...(attempt ? { format: 'bestaudio[ext=m4a]/bestaudio/best' } : {}),
      });
      await resourceReady(source, signal, 20000);
      signal.throwIfAborted();

      if (source.failed) {
        throw new Error('TRACK_START_FAILED');
      }

      return source;
    } catch (error) {
      source?.stop();
      signal.throwIfAborted();
      lastError = error;

      if (!attempt) {
        console.warn(
          '[music] initial audio unavailable; retrying fresh extraction with alternate format',
        );
      }
    }
  }

  throw lastError;
}
