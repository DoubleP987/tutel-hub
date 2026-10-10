import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = [
  'app.css',
  'calendar-view.js',
  'preferences.js',
  'icon.png',
  'app-icon.png',
  'manifest.webmanifest',
];
const targets = ['vercel-public', 'netlify-public'];

for (const target of targets) {
  await mkdir(resolve(root, target), { recursive: true });

  for (const asset of assets) {
    await copyFile(resolve(root, 'src/web/public', asset), resolve(root, target, asset));
  }

  console.log(`Updated shared assets in ${target}.`);
}
