import { spawn } from 'node:child_process';
import { createAudioResource, StreamType } from '@discordjs/voice';
import ffmpegStaticPath from 'ffmpeg-static';

const executable = process.env.YT_DLP_PATH || 'yt-dlp';
const ffmpegPath = process.env.FFMPEG_PATH || ffmpegStaticPath;
function resolveQuery(sourceQuery) {
  return new Promise((resolve, reject) => {
    const args = ['--no-cache-dir', '--no-progress', '--dump-single-json', '--no-warnings', '--no-playlist', sourceQuery];
    const child = spawn(executable, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    let out = ''; let err = '';
    child.stdout.setEncoding('utf8'); child.stdout.on('data', chunk => { out += chunk; if (out.length > 2_000_000) child.kill(); });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', chunk => { err += chunk; });
    child.once('error', reject);
    child.once('close', code => {
      if (code !== 0 || !out.trim()) return reject(new Error(err || 'yt-dlp exited with code ' + code));
      try {
        const result = JSON.parse(out);
        const entries = (result.entries || [result]).filter(item => item && !item.error && (item.webpage_url || item.original_url || item.url));
        if (!entries.length) return reject(new Error('ไม่พบเพลงจากแหล่งค้นหา'));
        resolve(entries.map(item => ({
          title: item.title || result.title || 'Unknown title',
          url: item.webpage_url || item.original_url || (item.url?.startsWith('http') ? item.url : null),
          duration: item.duration || 0
        })));
      } catch (error) { reject(error); }
    });
  });
}
export async function resolveTrack(query) {
  const searchPrefix = process.env.MUSIC_SEARCH_PREFIX || 'ytsearch1';
  const sourcePrefix = searchPrefix === 'scsearch1' ? 'scsearch10' : searchPrefix;
  const sourceQuery = query.includes('://') ? query : sourcePrefix + ':' + query;
  const results = await resolveQuery(sourceQuery);
  const track = results.find(item => !item.duration || item.duration > 30);
  if (!track) throw new Error('ผลค้นหา SoundCloud ที่พบเป็นพรีวิวสั้น กรุณาลองค้นด้วยชื่อศิลปินหรือชื่อเพลงเพิ่มเติม');
  return track;
}
const randomSearches = [
  'เพลงไทยฮิต', 'เพลงลูกทุ่งฮิต', 'เพลงสตริงไทย', 'เพลงเพื่อชีวิต',
  'เพลงยุค 90 ไทย', 'เพลงป๊อปไทย', 'เพลงอินดี้ไทย', 'เพลงรักไทย'
];
export async function resolveRandomTrack(excludedUrls = []) {
  const excluded = new Set(excludedUrls);
  const query = randomSearches[Math.floor(Math.random() * randomSearches.length)];
  const results = await resolveQuery('scsearch10:' + query);
  const candidates = results.filter(track => (!track.duration || track.duration > 30) && !excluded.has(track.url));
  if (!candidates.length) throw new Error('ไม่พบเพลงใหม่ในผลค้นหา ลองสุ่มใหม่อีกครั้ง');
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export function createTrackResource(track) {
  console.log(`[stream] Starting ${track.title}`);
  const downloader = spawn(executable, ['--no-cache-dir', '--no-progress', '--no-part', '--paths', 'temp:/tmp', '-f', 'bestaudio[protocol^=http]/bestaudio/best', '--no-playlist', '-o', '-', track.url], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  downloader.stderr.on('data', chunk => process.stderr.write(`[yt-dlp] ${chunk}`));
  downloader.once('error', error => { console.error('[yt-dlp] process failed:', error); });
  downloader.once('close', code => console.log(`[yt-dlp] process ended (${code})`));
  const transcoder = spawn(ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-f', 's16le', '-ar', '48000', '-ac', '2', 'pipe:1'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
  transcoder.stdin.on('error', error => { if (error.code !== 'EPIPE') console.error('[ffmpeg] input error:', error); });
  downloader.stdout.pipe(transcoder.stdin);
  transcoder.stderr.on('data', chunk => process.stderr.write(`[ffmpeg] ${chunk}`));
  let pcmBytes = 0;
  transcoder.stdout.on('data', chunk => { pcmBytes += chunk.length; });
  transcoder.once('error', error => { console.error('[ffmpeg] process failed:', error); downloader.kill(); });
  transcoder.once('close', code => { console.log(`[ffmpeg] process ended (${code}); produced ${Math.round(pcmBytes / 192000)} seconds of PCM`); downloader.kill(); });
  return { resource: createAudioResource(transcoder.stdout, { inputType: StreamType.Raw }), stop: () => { downloader.kill(); transcoder.kill(); } };
}


export function createRadioResource(station) {
  const transcoder = spawn(ffmpegPath, ['-nostdin','-hide_banner','-loglevel','warning','-reconnect','1','-reconnect_streamed','1','-reconnect_delay_max','5','-i',station.url,'-vn','-f','s16le','-ar','48000','-ac','2','pipe:1'], {stdio:['ignore','pipe','pipe'],windowsHide:true});
  transcoder.stderr.on('data', chunk => process.stderr.write('[radio] '+chunk));
  transcoder.once('error', error => console.error('[radio] ffmpeg failed:',error));
  transcoder.once('close', code => console.log('[radio] ffmpeg ended ('+code+')'));
  return {resource:createAudioResource(transcoder.stdout,{inputType:StreamType.Raw}),stop:()=>{if(!transcoder.killed)transcoder.kill();}};
}
