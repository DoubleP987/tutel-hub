import { searchTracks } from './search.js';

const cache = new Map();

const knownDuration = (track) =>
  Number.isFinite(Number(track?.duration)) && Number(track.duration) > 0;

// Resolve only the selected song. Never extract every item in a playlist up front.
// A missing field is not proof that the song is short or that it is live.
export async function hydrateTrack(track, { signal } = {}) {
  signal?.throwIfAborted();

  if (!track || track.live || knownDuration(track)) {
    return track;
  }

  if (!/^https?:\/\//i.test(track.url || '')) {
    return track;
  }

  const cached = cache.get(track.url);

  if (cached?.until > Date.now()) {
    Object.assign(track, cached.details);
    return track;
  }

  const deadline = AbortSignal.timeout(6000);
  const lookupSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;

  try {
    const [details] = await searchTracks(track.url, { signal: lookupSignal });
    signal?.throwIfAborted();

    if (details && (knownDuration(details) || details.live)) {
      const metadata = {
        duration: knownDuration(details) ? Number(details.duration) : 0,
        live: !!details.live,
      };

      if (details.title) {
        metadata.title = details.title;
      }

      if (details.artist) {
        metadata.artist = details.artist;
      }

      if (details.thumbnail) {
        metadata.thumbnail = details.thumbnail;
      }

      if (cache.size >= 128) {
        cache.delete(cache.keys().next().value);
      }

      cache.set(track.url, { until: Date.now() + 300000, details: metadata });
      Object.assign(track, metadata);
    }
  } catch {
    // Metadata failure must not reject a playable link; cancellation still wins.
    signal?.throwIfAborted();
  }

  return track;
}
