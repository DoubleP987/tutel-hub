// Parse supported providers without making a network request.
export function musicLink(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { playlist: false, mixed: false };
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const youtube = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'].includes(host);
  if (youtube) {
    const id =
      host === 'youtu.be'
        ? url.pathname.split('/')[1]
        : url.searchParams.get('v') ||
          (/^\/(shorts|live|embed)\//.test(url.pathname) ? url.pathname.split('/')[2] : null);
    const video = /^[\w-]{11}$/.test(id || '') ? id : null;
    const list = url.searchParams.get('list');
    return {
      provider: 'youtube',
      playlist: !!list,
      mixed: !!list && !!video,
      singleUrl: video ? `https://www.youtube.com/watch?v=${video}` : null,
      playlistUrl: list ? url.href : null,
      id: video,
    };
  }
  if (host === 'soundcloud.com' || host === 'm.soundcloud.com') {
    return {
      provider: 'soundcloud',
      playlist: /\/sets\/[^/]+/.test(url.pathname),
      mixed: false,
      playlistUrl: url.href,
    };
  }
  return { playlist: false, mixed: false };
}
export async function resolveMusicLink(value, { signal } = {}) {
  let target;
  try {
    target = new URL(value);
  } catch {
    return musicLink(value);
  }
  if (target.hostname !== 'on.soundcloud.com') return musicLink(value);
  for (let i = 0; i < 4; i++) {
    if (
      !['on.soundcloud.com', 'soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(
        target.hostname,
      ) ||
      target.protocol !== 'https:'
    )
      break;
    if (target.hostname !== 'on.soundcloud.com') return musicLink(target.href);
    const response = await fetch(target.href, {
      method: 'HEAD',
      redirect: 'manual',
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
        : AbortSignal.timeout(4000),
    });
    const location = response.headers.get('location');
    if (!location) break;
    target = new URL(location, target);
  }
  return musicLink(value);
}

const titles = new Map();
export async function youtubeTrack(link, { signal } = {}) {
  const cached = titles.get(link.id);
  if (cached && cached.until > Date.now()) return { ...cached.track };
  const track = { title: `YouTube · ${link.id}`, url: link.singleUrl, duration: 0 };
  try {
    const timeout = AbortSignal.timeout(4000);
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(link.singleUrl)}&format=json`,
      {
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    if (response.ok) {
      const metadata = await response.json();
      track.title = String(metadata.title || track.title).slice(0, 500);
      track.artist = String(metadata.author_name || '').slice(0, 200);
      track.thumbnail = metadata.thumbnail_url;
    }
  } catch {
    /* Media extraction still happens once, when playback starts. */
  }
  signal?.throwIfAborted();
  if (titles.size >= 128) titles.delete(titles.keys().next().value);
  titles.set(link.id, { until: Date.now() + 300000, track });
  return { ...track };
}
