import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import bundledPath from 'ffmpeg-static';

// The bundled Linux build can crash on remote HTTPS input. Prefer Ubuntu's build.
export const ffmpegPath =
  process.env.FFMPEG_PATH ||
  (process.platform === 'linux'
    ? ['/usr/bin/ffmpeg', join(homedir(), '.local/bin/tutel-ffmpeg')].find(existsSync)
    : null) ||
  bundledPath;
