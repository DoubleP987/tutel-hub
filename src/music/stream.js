import { spawn } from 'node:child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import ffmpegStaticPath from 'ffmpeg-static';
import { searchTracks, ytDlpPath, ytDlpRuntimeArgs } from './search.js';

const executable = ytDlpPath;
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStaticPath;
export async function resolveTrack(query, source = 'youtube') {
  const sourcePrefix = source === 'soundcloud' ? 'scsearch3' : 'ytsearch1';
  const sourceQuery = query.includes('://') ? query : sourcePrefix + ':' + query;
  const results = await searchTracks(sourceQuery);
  const track = results.find((item) => !item.duration || item.duration > 30);
  if (!track) throw new Error('ผลค้นหาที่พบเป็นคลิปสั้น กรุณาลองชื่อศิลปินหรือชื่อเพลงเพิ่มเติม');
  return track;
}

export function createTrackResource(track) {
  console.log(`[stream] Starting ${track.title}`);
  const downloader = spawn(
    executable,
    [
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
    console.error('[yt-dlp] process failed:', error);
  });
  downloader.once('close', (code) => console.log(`[yt-dlp] process ended (${code})`));
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
    console.error('[ffmpeg] process failed:', error);
    downloader.kill();
  });
  transcoder.once('close', (code) => {
    console.log(
      `[ffmpeg] process ended (${code}); produced ${Math.round(pcmBytes / 192000)} seconds of PCM`,
    );
    downloader.kill();
  });
  return {
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
