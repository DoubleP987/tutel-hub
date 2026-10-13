import { controlBasePath, controlPath } from '../paths.js';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function registerAssetsRoutes(app, publicPath) {
  for (const file of [
    'calendar-view.js',
    'preferences.js',
    'bot-logs.js',
    'calendar-admin.js',
    'feedback-inbox.js',
    'manifest.webmanifest',
    'sw.js',
    'icon.png',
    'app-icon.png',
  ]) {
    app.get('/' + file, async (req, res) => {
      if (file === 'manifest.webmanifest' && controlBasePath) {
        const manifest = JSON.parse(await readFile(resolve(publicPath, file), 'utf8'));
        manifest.start_url = controlPath('/');
        manifest.scope = controlPath('/');
        for (const icon of manifest.icons || []) icon.src = controlPath(icon.src);
        return res.type('application/manifest+json').json(manifest);
      }
      res.sendFile(resolve(publicPath, file));
    });
  }
}
