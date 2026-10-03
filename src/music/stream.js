import { t } from '../i18n/bot.js';
import { spawn } from 'node:child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import ffmpegStaticPath from 'ffmpeg-static';
import { searchTracks, ytDlpPath, ytDlpRuntimeArgs } from './search.js';
import { selectRequestedTrack } from './selection.js';
import { musicLink, youtubeTrack } from './links.js';

const executable = ytDlpPath;
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStaticPath;
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
  return track;
}

export function createTrackResource(track) {
  let failed = false;
  console.log(`[stream] Starting ${track.title}`);
  const downloader = spawn(
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
  downloader.stderr.on('data', (chunk) => process.stderr.write(`[yt-dlp] ${chunk}`));
  downloader.once('error', (error) => {
    failed = true;
    console.error('[yt-dlp] process failed:', error);
  });
  downloader.once('close', (code) => {
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
  downloader.stdout.pipe(transcoder.stdin);
  transcoder.stderr.on('data', (chunk) => process.stderr.write(`[ffmpeg] ${chunk}`));
  let pcmBytes = 0;
  transcoder.stdout.on('data', (chunk) => {
    pcmBytes += chunk.length;
  });
  transcoder.once('error', (error) => {
    failed = true;
    console.error('[ffmpeg] process failed:', error);
    downloader.kill();
  });
  transcoder.once('close', (code) => {
    if (code !== 0) failed = true;
    console.log(
      `[ffmpeg] process ended (${code}); produced ${Math.round(pcmBytes / 192000)} seconds of PCM`,
    );
    downloader.kill();
  });
  return {
    get failed() {
      return failed;
    },
    resource: createAudioResource(transcoder.stdout, { inputType: StreamType.Raw }),
    stop: () => {
      downloader.kill();
      transcoder.kill();
    },
  };
}

export function createRadioResource(station) {
  const transcoder = spawn(
    ffmpegPath,
    [
      '-nostdin',
      '-hide_banner',
      '-loglevel',
      'warning',
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
  transcoder.once('error', (error) => console.error('[radio] ffmpeg failed:', error));
  transcoder.once('close', (code) => console.log('[radio] ffmpeg ended (' + code + ')'));
  return {
    resource: createAudioResource(transcoder.stdout, { inputType: StreamType.Raw }),
    stop: () => {
      if (!transcoder.killed) transcoder.kill();
    },
  };
}
