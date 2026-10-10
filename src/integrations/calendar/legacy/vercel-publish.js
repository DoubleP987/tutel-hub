import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setting, setSetting } from '../../../database/settings.js';

const files = [
  'index.html',
  'calendar.js',
  'app.css',
  'calendar.json',
  'preferences.js',
  'manifest.webmanifest',
  'sw.js',
  'icon.png',
  'app-icon.png',
  'calendar-view.js',
  'vercel.json',
];

export async function publishVercel(directory, { request = fetch } = {}) {
  const token = process.env.VERCEL_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID;

  if (!token?.trim() || !project?.trim()) {
    return { pending: true, provider: 'vercel' };
  }

  const team = process.env.VERCEL_TEAM_ID?.trim();
  const scope = team ? '?teamId=' + encodeURIComponent(team) : '';
  const root = process.env.VERCEL_ROOT_DIRECTORY?.trim().replace(/^\/+|\/+$/g, '') || '';
  const content = files.map((file) => ({
    file: root ? root + '/' + file : file,
    data: readFileSync(resolve(directory, file)).toString('base64'),
    encoding: 'base64',
  }));
  const identity = project + '|' + (team || '');
  const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');

  if (setting('vercel_public_hash') === hash && setting('vercel_public_project') === identity) {
    return { unchanged: true, provider: 'vercel' };
  }

  const headers = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
  const response = await request('https://api.vercel.com/v13/deployments' + scope, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: process.env.VERCEL_PROJECT_NAME || 'tutel-calendar',
      project,
      target: 'production',
      files: content,
      projectSettings: {
        framework: null,
        buildCommand: '',
        installCommand: '',
        outputDirectory: '.',
        rootDirectory: root || null,
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  let deployment = await response.json();

  if (!response.ok) {
    throw new Error(
      'Vercel deploy HTTP ' +
        response.status +
        ': ' +
        (deployment.error?.message || 'request rejected'),
    );
  }

  if (!deployment.id) {
    throw new Error('Vercel did not return a deployment ID.');
  }

  for (let n = 0; deployment.readyState !== 'READY' && n < 45; n++) {
    if (['ERROR', 'CANCELED'].includes(deployment.readyState)) {
      throw new Error('Vercel deployment ' + deployment.readyState);
    }

    await new Promise((done) => setTimeout(done, 2000));
    const check = await request(
      'https://api.vercel.com/v13/deployments/' + encodeURIComponent(deployment.id) + scope,
      { headers, signal: AbortSignal.timeout(10000) },
    );

    if (!check.ok) {
      throw new Error('Vercel status HTTP ' + check.status);
    }

    deployment = await check.json();
  }

  if (deployment.readyState !== 'READY') {
    throw new Error('Vercel deployment is still processing.');
  }

  await setSetting('vercel_public_hash', hash);
  await setSetting('vercel_public_project', identity);
  await setSetting('vercel_last_sync_at', new Date().toISOString());
  await setSetting('vercel_last_error', '');
  return { ready: true, provider: 'vercel', id: deployment.id, url: 'https://' + deployment.url };
}
