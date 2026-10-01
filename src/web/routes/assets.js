import { resolve } from 'node:path';

export function registerAssetsRoutes(app, publicPath) {
  for (const file of [
    'calendar-view.js',
    'preferences.js',
    'manifest.webmanifest',
    'sw.js',
    'icon.png',
    'app-icon.png',
  ])
    app.get('/' + file, (req, res) => res.sendFile(resolve(publicPath, file)));
}
