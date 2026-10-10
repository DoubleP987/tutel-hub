import { spawn } from 'node:child_process';
import { ytDlpPath, ytDlpRuntimeArgs } from './search.js';

export const MAX_PLAYLIST_TRACKS = 100;

export function playlistTrack(entry) {
  if (
    !entry ||
    entry.error ||
    ['private', 'premium_only', 'subscriber_only', 'needs_auth'].includes(entry.availability)
  ) {
    return null;
  }

  if (/^\[(?:Deleted|Private) video\]$/i.test(entry.title || '')) {
    return null;
  }

  let url = entry.webpage_url || entry.original_url || entry.url;

  if (
    (!url || !url.startsWith('http')) &&
    (entry.ie_key === 'Youtube' || entry.extractor_key === 'Youtube')
  ) {
    url = `https://www.youtube.com/watch?v=${entry.id}`;
  }

  if (!/^https?:\/\//i.test(url || '')) {
    return null;
  }

  const soundcloud = entry.ie_key === 'Soundcloud' || entry.extractor_key === 'Soundcloud';
  const title =
    entry.title ||
    (soundcloud
      ? new URL(url).pathname.split('/').filter(Boolean).at(-1)?.replace(/-/g, ' ')
      : null);

  if (!title) {
    return null;
  }

  return {
    title: String(title).slice(0, 500),
    url,
    duration: Number(entry.duration) || 0,
    artist: entry.artist || entry.uploader || entry.channel || '',
    thumbnail: entry.thumbnail || entry.thumbnails?.at(-1)?.url || null,
    live: !!entry.is_live || entry.live_status === 'is_live',
  };
}

export function readPlaylist(url, { signal, onProgress = () => {}, executable = ytDlpPath } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('PLAYLIST_CANCELLED'));
    }

    const child = spawn(
      executable,
      [
        '--ignore-config',
        '--no-cache-dir',
        '--no-progress',
        '--no-warnings',
        '--skip-download',
        '--flat-playlist',
        '--yes-playlist',
        '--ignore-errors',
        '--dump-json',
        '--playlist-end',
        String(MAX_PLAYLIST_TRACKS),
        '--socket-timeout',
        '10',
        '--retries',
        '1',
        '--extractor-retries',
        '1',
        ...ytDlpRuntimeArgs,
        '--',
        url,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    const tracks = [];
    let buffer = '';
    let stderr = '';
    let bytes = 0;
    let skipped = 0;
    let failure;

    const cancel = () => {
      failure = new Error('PLAYLIST_CANCELLED');
      child.kill();
    };

    const timer = setTimeout(() => {
      failure = new Error('PLAYLIST_TIMEOUT');
      child.kill();
    }, 45000);
    timer.unref();
    signal?.addEventListener('abort', cancel, { once: true });

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    };

    const line = (text) => {
      if (!text.trim()) {
        return;
      }

      try {
        const track = playlistTrack(JSON.parse(text));

        if (track && tracks.length < MAX_PLAYLIST_TRACKS) {
          tracks.push(track);
        } else {
          skipped++;
        }

        onProgress({ found: tracks.length, skipped });
      } catch {
        skipped++;
      }
    };

    child.stdout.setEncoding('utf8');

    child.stdout.on('data', (chunk) => {
      bytes += Buffer.byteLength(chunk);
      buffer += chunk;

      if (bytes > 12_000_000 || buffer.length > 2_000_000) {
        failure = new Error('PLAYLIST_TOO_LARGE');
        child.kill();
        return;
      }

      let index;

      while ((index = buffer.indexOf('\n')) !== -1) {
        line(buffer.slice(0, index));
        buffer = buffer.slice(index + 1);
      }
    });

    child.stderr.setEncoding('utf8');

    child.stderr.on('data', (chunk) => {
      stderr = (stderr + chunk).slice(-1000);
    });

    child.once('error', (error) => {
      cleanup();
      reject(error);
    });

    child.once('close', (code) => {
      cleanup();

      if (failure) {
        return reject(failure);
      }

      line(buffer);

      if (!tracks.length) {
        return reject(new Error('PLAYLIST_EMPTY: ' + stderr));
      }

      resolve({
        tracks,
        skipped,
        limited: tracks.length + skipped >= MAX_PLAYLIST_TRACKS,
        partial: code !== 0,
      });
    });
  });
}
