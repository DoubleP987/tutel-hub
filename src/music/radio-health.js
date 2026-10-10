import { spawn } from 'node:child_process';
import { ffmpegPath } from './ffmpeg.js';

const cache = new Map();
const pending = new Map();
const waiting = [];
let active = 0;

async function slot() {
  if (active >= 2) {
    await new Promise((resolve) => waiting.push(resolve));
  } else {
    active++;
  }
}

function release() {
  const next = waiting.shift();

  if (next) {
    next();
  } else {
    active--;
  }
}

// Decode one second, only on demand. A reachable HTTP endpoint alone is not audio.
export async function probeRadio(station, { refresh = false } = {}) {
  const url = station.url;

  if (!/^https?:\/\//i.test(url || '')) {
    return { status: 'unavailable' };
  }

  if (!refresh && cache.get(url)?.expires > Date.now()) {
    return cache.get(url).result;
  }

  if (pending.has(url)) {
    return pending.get(url);
  }

  if (pending.size >= 64) {
    return { status: 'unknown' };
  }

  const promise = (async () => {
    await slot();

    try {
      const result = await new Promise((resolve) => {
        let bytes = 0;
        let peak = 0;
        let error = '';
        let done = false;
        const child = spawn(
          ffmpegPath,
          [
            '-nostdin',
            '-hide_banner',
            '-loglevel',
            'error',
            '-rw_timeout',
            '5000000',
            '-i',
            url,
            '-t',
            '1',
            '-vn',
            '-ar',
            '8000',
            '-ac',
            '1',
            '-f',
            's16le',
            'pipe:1',
          ],
          { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
        );

        const finish = (status) => {
          if (done) {
            return;
          }

          done = true;
          clearTimeout(timer);
          resolve({ status, checkedAt: Date.now() });
        };

        const timer = setTimeout(() => {
          child.kill();
          finish(bytes ? (peak > 16 ? 'online' : 'silent') : 'timeout');
        }, 8000);

        child.stdout.on('data', (chunk) => {
          bytes += chunk.length;

          for (let i = 0; i + 1 < chunk.length; i += 2) {
            peak = Math.max(peak, Math.abs(chunk.readInt16LE(i)));
          }
        });

        child.stderr.on('data', (chunk) => {
          error = (error + chunk).slice(-2000);
        });

        child.once('error', () => finish('decoder'));

        child.once('close', () =>
          finish(
            bytes
              ? peak > 16
                ? 'online'
                : 'silent'
              : /401|403|Unauthorized|Forbidden/i.test(error)
                ? 'blocked'
                : /resolve hostname|name resolution/i.test(error)
                  ? 'dns'
                  : /404|410|Not Found|refused/i.test(error)
                    ? 'offline'
                    : 'unavailable',
          ),
        );
      });

      if (cache.size >= 128) {
        cache.delete(cache.keys().next().value);
      }

      cache.set(url, {
        expires: Date.now() + (result.status === 'online' ? 180000 : 30000),
        result,
      });
      return result;
    } finally {
      release();
    }
  })();
  pending.set(url, promise);

  try {
    return await promise;
  } finally {
    pending.delete(url);
  }
}

export const radioHealthLabels = {
  online: '🟢 มีเสียง',
  silent: '🟡 สตรีมเงียบ',
  offline: '🔴 ออฟไลน์ / ไม่พบสตรีม',
  blocked: '🔴 ต้นทางปฏิเสธการเข้าถึง',
  dns: '🔴 หาโดเมนสตรีมไม่เจอ',
  timeout: '🟡 สตรีมไม่ตอบกลับ',
  decoder: '🔴 ตัวถอดรหัสมีปัญหา',
  unavailable: '🔴 เปิดสตรีมไม่ได้',
  unknown: '⚪ ยังไม่ได้ตรวจ',
};
