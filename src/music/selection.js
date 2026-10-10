// A typed song name can rank a short clip first. Look through several results
// before falling back to it; a direct link always preserves the user's choice.
export function selectRequestedTrack(tracks, { direct = false } = {}) {
  if (direct) {
    return tracks[0] || null;
  }

  return (
    tracks.find((track) => !track.live && (!track.duration || track.duration > 30)) ||
    tracks.find((track) => !track.live) ||
    tracks[0] ||
    null
  );
}
