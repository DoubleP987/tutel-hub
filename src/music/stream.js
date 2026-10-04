import { hydrateTrack } from './metadata.js';
import { t } from '../i18n/bot.js';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { createAudioResource, StreamType } from '@discordjs/voice';
import { ffmpegPath } from './ffmpeg.js';
import { searchTracks, ytDlpPath, ytDlpRuntimeArgs } from './search.js';
import { selectRequestedTrack } from './selection.js';
import { musicLink, youtubeTrack } from './links.js';
import { SmoothPcm } from './transition.js';

const executable = ytDlpPath;
export async function resolveTrack(query, source = 'youtube', { signal } = {}) {
  query = String(query || '').trim();
  const direct = /^https?:\/\//i.test(query);
  const link = musicLink(query);
  if (link.singleUrl) return youtubeTrack(link, { signal });
  if (link.playlist) throw new Error('Use the playlist importer for playlist links');
  const sourcePrefix = source === 'soundcloud' ? 'scsearch5' : 'ytsearch5';
  const sourceQuery = direct ? query : sourcePrefix + ':' + query;
  // Flat name search avoids extracting full media metadata for five videos.
  // The chosen URL is extracted when the audio stream starts.
  const results = await searchTracks(sourceQuery, { flat: !direct, signal });
  const track = selectRequestedTrack(results, { direct });
  if (!track) throw new Error(t('ไม่พบเพลงจากแหล่งค้นหา'));
  return hydrateTrack(track, { signal });
}

export async function cacheTrackAudio(track, { signal } = {}) {
  const child = spawn(
    executable,
    [
      '--ignore-config',
      '--no-cache-dir',
      '--no-progress',
      '--no-part',
      ...ytDlpRuntimeArgs,
      '--socket-timeout',
      '15',
      '--retries',
      '2',
      '-f',
      'bestaudio[protocol^=http]/bestaudio/best',
      '--no-playlist',
      '-o',
      '-',
      track.url,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0,
      error = null;
    const abort = () => {
      error = new Error('PRELOAD_CANCELLED');
      child.kill();
    };
    const timeout = setTimeout(() => {
      error = new Error('PRELOAD_TIMEOUT');
      child.kill();
    }, 90000);
    timeout.unref?.();
    child.stderr.on('data', (chunk) => process.stderr.write('[preload] ' + chunk));
    child.stdout.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > 32 * 1024 * 1024) {
        error = new Error('PRELOAD_TOO_LARGE');
        child.kill();
      } else if (!error) chunks.push(chunk);
    });
    child.once('error', (cause) => {
      error = cause;
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
      if (error || code !== 0 || !bytes) reject(error || new Error('PRELOAD_FAILED'));
      else resolve(Buffer.concat(chunks, bytes));
    });
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}

export function createTrackResource(track, { smooth = false, pcmOnly = false, media } = {}) {
  let failed = false;
  console.log(`[stream] Starting ${track.title}`);
  const downloader = media
    ? null
    : spawn(
        executable,
        [
          '--ignore-config',
          '--no-cache-dir',
          '--no-progress',
          '--no-part',
          ...ytDlpRuntimeArgs,
          '--socket-timeout',
          '15',
          '--retries',
          '3',
          '-f',
          'bestaudio[protocol^=http]/bestaudio/best',
          '--no-playlist',
          '-o',
          '-',
          track.url,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
      );
  downloader?.stderr.on('data', (chunk) => process.stderr.write(`[yt-dlp] ${chunk}`));
  downloader?.once('error', (error) => {
    failed = true;
    console.error('[yt-dlp] process failed:', error);
  });
  downloader?.once('close', (code) => {
    if (code !== 0) failed = true;
    console.log(`[yt-dlp] process ended (${code})`);
  });
  const transcoder = spawn(
    ffmpegPath,
    [
      '-hide_banner',
      '-loglevel',
      'error',
      '-i',
      'pipe:0',
      ...(pcmOnly
        ? ['-af', 'silenceremove=start_periods=1:start_duration=0.02:start_threshold=-60dB']
        : []),
      '-f',
      's16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      'pipe:1',
    ],
    { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
  );
  transcoder.stdin.on('error', (error) => {
    if (error.code !== 'EPIPE') console.error('[ffmpeg] input error:', error);
  });
  const input = downloader?.stdout || Readable.from([media]);
  input.pipe(transcoder.stdin);
  transcoder.stderr.on('data', (chunk) => process.stderr.write(`[ffmpeg] ${chunk}`));
  let pcmBytes = 0;
  transcoder.stdout.on('data', (chunk) => {
    pcmBytes += chunk.length;
  });
  transcoder.once('error', (error) => {
    failed = true;
    console.error('[ffmpeg] process failed:', error);
    downloader?.kill();
  });
  transcoder.once('close', (code) => {
    if (code !== 0) failed = true;
    console.log(
      `[ffmpeg] process ended (${code}); produced ${Math.round(pcmBytes / 192000)} seconds of PCM`,
    );
    downloader?.kill();
  });
  const raw = {
    pcm: transcoder.stdout,
    get failed() {
      return failed;
    },
    stop: () => {
      input.destroy();
      downloader?.kill();
      transcoder.kill();
    },
  };
  transcoder.stdout.on('error', () => {
    failed = true;
  });
  if (pcmOnly) return raw;
  const fade = new SmoothPcm(smooth);
  transcoder.stdout.pipe(fade);
  const resource = createAudioResource(fade, {
    inputType: StreamType.Raw,
    inlineVolume: true,
    silencePaddingFrames: smooth ? 0 : 5,
  });
  // A prepared resource has no AudioPlayer attached yet; absorb and record errors.
  resource.playStream.on('error', (error) => {
    failed = true;
    console.warn('[stream] resource error:', error.message);
  });
  return {
    get failed() {
      return failed;
    },
    resource,
    takePcm: () => {
      transcoder.stdout.unpipe(fade);
      fade.destroy();
      resource.playStream.destroy();
      return raw;
    },
    setSmooth: (enabled) => {
      fade.enabled = enabled;
    },
    stop: () => {
      input.destroy();
      downloader?.kill();
      transcoder.kill();
      fade.destroy();
      resource.playStream.destroy();
    },
  };
}

export function createRadioResource(station) {
  let failed = false;
  let pcmBytes = 0;
  const transcoder = spawn(
    ffmpegPath,
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'warning',
      '-rw_timeout',
      '15000000',
      '-reconnect',
      '1',
      '-reconnect_streamed',
      '1',
      '-reconnect_delay_max',
      '5',
      '-i',
      station.url,
      '-vn',
      '-f',
      's16le',
      '-ar',
      '48000',
      '-ac',
      '2',
      'pipe:1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  transcoder.stderr.on('data', (chunk) => process.stderr.write('[radio] ' + chunk));
  transcoder.stdout.on('data', (chunk) => {
    pcmBytes += chunk.length;
  });
  transcoder.once('error', (error) => {
    failed = true;
    console.error('[radio] ffmpeg failed:', error.message);
  });
  transcoder.once('close', (code, signal) => {
    if (code !== 0) failed = true;
    console.log(
      `[radio] ffmpeg ended (${code}; signal=${signal || 'none'}); PCM=${Math.round(pcmBytes / 192000)}s`,
    );
  });
  const resource = createAudioResource(transcoder.stdout, {
    inputType: StreamType.Raw,
  });
  resource.playStream.on('error', (error) => {
    failed = true;
    console.warn('[radio] resource error:', error.message);
  });
  let stopped = false;
  return {
    get failed() {
      return failed;
    },
    resource,
    stop: () => {
      if (stopped) return;
      stopped = true;
      resource.playStream.destroy();
      transcoder.stdout.destroy();
      transcoder.kill();
      const forceStop = setTimeout(() => {
        if (transcoder.exitCode === null && transcoder.signalCode === null)
          transcoder.kill('SIGKILL');
      }, 2000);
      forceStop.unref();
      transcoder.once('close', () => clearTimeout(forceStop));
    },
  };
}
