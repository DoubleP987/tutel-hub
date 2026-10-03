import { spawn } from 'node:child_process';

export const ytDlpPath = process.env.YT_DLP_PATH || 'yt-dlp';
export const ytDlpRuntimeArgs = ['--js-runtimes', `node:${process.execPath}`];

export function searchTracks(query, { flat = false, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Music search cancelled'));
    const child = spawn(
      ytDlpPath,
      [
        '--ignore-config',
        '--no-cache-dir',
        '--no-progress',
        '--dump-single-json',
        '--no-warnings',
        '--no-playlist',
        '--socket-timeout',
        '15',
        '--retries',
        '2',
        ...ytDlpRuntimeArgs,
        ...(flat ? ['--flat-playlist'] : []),
        query,
      ],
      { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
    );
    let output = '',
      errorOutput = '',
      failure = null;
    const cancel = () => {
      failure = new Error('Music search cancelled');
      child.kill();
    };
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => {
      failure = new Error('ค้นหาเพลงนานเกินไป จะลองรายการอื่น');
      child.kill();
    }, 25000);
    timer.unref();
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      output += chunk;
      if (output.length > (flat ? 2_000_000 : 12_000_000)) {
        failure = new Error('ข้อมูลผลค้นหาเพลงมีขนาดเกินกำหนด');
        child.kill();
      }
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => {
      errorOutput = (errorOutput + chunk).slice(-8000);
    });
    child.once('error', (error) => {
      cleanup();
      reject(error);
    });
    child.once('close', (code, exitSignal) => {
      cleanup();
      if (failure) return reject(failure);
      if (code !== 0 || !output.trim())
        return reject(new Error(errorOutput || `yt-dlp exited: ${code ?? exitSignal}`));
      try {
        const result = JSON.parse(output);
        const tracks = (result.entries || [result])
          .filter((entry) => entry && !entry.error)
          .map((entry) => {
            let url = entry.webpage_url || entry.original_url || entry.url;
            if (
              (!url || !url.startsWith('http')) &&
              (entry.ie_key === 'Youtube' || entry.extractor_key === 'Youtube')
            )
              url = `https://www.youtube.com/watch?v=${entry.id}`;
            return {
              title:
                entry.title ||
                (url?.includes('soundcloud.com/')
                  ? new URL(url).pathname.split('/').at(-1).replace(/-/g, ' ')
                  : 'Unknown title'),
              url,
              duration: Number(entry.duration) || 0,
              genre: String(entry.genre || '').slice(0, 200),
              artist:
                entry.artist ||
                entry.creator ||
                entry.uploader ||
                entry.channel ||
                entry.album_artist ||
                '',
              thumbnail: entry.thumbnail || entry.thumbnails?.at(-1)?.url || null,
              live:
                entry.is_live ||
                entry.live_status === 'is_live' ||
                entry.live_status === 'is_upcoming',
            };
          })
          .filter((track) => track.url?.startsWith('http'));
        if (!tracks.length) throw new Error('ไม่พบเพลงจากแหล่งค้นหา');
        resolve(tracks);
      } catch (error) {
        reject(error);
      }
    });
  });
}
