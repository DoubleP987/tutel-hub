import 'dotenv/config';
import { syncCalendarApi } from './api-sync.js';
import { publishVercel } from './vercel-publish.js';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setting, setSetting } from './db.js';
import { exportSnapshot } from './public/snapshot.js';
import { publicZip } from './public/archive.js';

export { publicEvent, buildSnapshot, exportSnapshot } from './public/snapshot.js';
export { siteFiles, publicZip } from './public/archive.js';

export async function publishSnapshot(
  directory,
  {
    request = fetch,
    token = process.env.NETLIFY_AUTH_TOKEN,
    site = process.env.NETLIFY_SITE_ID,
    force = false,
  } = {},
) {
  if (process.env.PUBLIC_DEPLOY_PROVIDER === 'calendar-api')
    return syncCalendarApi(directory, { request, force });
  if (process.env.PUBLIC_DEPLOY_PROVIDER === 'vercel') return publishVercel(directory, { request });
  if (!token?.trim()) return { pending: true };
  if (!site?.trim()) throw new Error('Set NETLIFY_SITE_ID before publishing.');
  const zip = publicZip(directory),
    hash = createHash('sha256').update(zip).digest('hex');
  if (setting('netlify_public_hash') === hash && setting('netlify_public_site') === site)
    return { unchanged: true };
  const headers = { Authorization: 'Bearer ' + token };
  const response = await request(
    'https://api.netlify.com/api/v1/sites/' + encodeURIComponent(site) + '/deploys',
    {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/zip' },
      body: zip,
      signal: AbortSignal.timeout(30000),
    },
  );
  if (!response.ok) throw new Error('Netlify deploy HTTP ' + response.status);
  let deploy = await response.json();
  if (!deploy.id) throw new Error('Netlify ไม่ส่ง deploy ID กลับมา');
  for (let n = 0; deploy.state !== 'ready' && n < 30; n++) {
    if (['error', 'rejected'].includes(deploy.state))
      throw new Error('Netlify deploy ' + deploy.state);
    await new Promise((done) => setTimeout(done, 2000));
    const check = await request(
      'https://api.netlify.com/api/v1/deploys/' + encodeURIComponent(deploy.id),
      { headers, signal: AbortSignal.timeout(10000) },
    );
    if (!check.ok) throw new Error('Netlify status HTTP ' + check.status);
    deploy = await check.json();
  }
  if (deploy.state !== 'ready') throw new Error('Netlify ยังประมวลผลไม่เสร็จ จะลองใหม่ภายหลัง');
  setSetting('netlify_public_hash', hash);
  setSetting('netlify_public_site', site);
  setSetting('netlify_last_sync_at', new Date().toISOString());
  setSetting('netlify_last_error', '');
  return { ready: true, id: deploy.id };
}
let currentSync = null,
  changeTimer = null;
const syncPrefix = () =>
  process.env.PUBLIC_DEPLOY_PROVIDER === 'calendar-api'
    ? 'calendar_api'
    : process.env.PUBLIC_DEPLOY_PROVIDER === 'vercel'
      ? 'vercel'
      : 'netlify';
export function publicSyncStatus() {
  const provider = process.env.PUBLIC_DEPLOY_PROVIDER;
  return {
    provider:
      provider === 'calendar-api' ? 'Calendar API' : provider === 'vercel' ? 'Vercel' : 'Netlify',
    configured:
      provider === 'calendar-api'
        ? !!(process.env.CALENDAR_SYNC_URL?.trim() && process.env.CALENDAR_SYNC_SECRET?.trim())
        : provider === 'vercel'
          ? !!(process.env.VERCEL_TOKEN?.trim() && process.env.VERCEL_PROJECT_ID?.trim())
          : !!process.env.NETLIFY_AUTH_TOKEN?.trim(),
    lastSync: setting(syncPrefix() + '_last_sync_at'),
    error: setting(syncPrefix() + '_last_error'),
  };
}
export function requestCalendarSync() {
  clearTimeout(changeTimer);
  changeTimer = setTimeout(() => {
    changeTimer = null;
    if (currentSync) void currentSync();
  }, 5000);
  changeTimer.unref();
}
export async function syncCalendarNow() {
  if (currentSync) return currentSync(true);
  const { path } = exportSnapshot();
  try {
    return await publishSnapshot(resolve(path, '..'), { force: true });
  } catch (error) {
    setSetting(syncPrefix() + '_last_error', error.message);
    throw error;
  }
}
export function startCalendarPublisher() {
  let busy = false,
    stopped = false,
    retryAfter = 0,
    failures = 0;
  const tick = async (force = false) => {
    if (busy || stopped) return { pending: true };
    busy = true;
    try {
      const { path } = exportSnapshot();
      if (!force && Date.now() < retryAfter) return { pending: true };
      const result = await publishSnapshot(resolve(path, '..'), { force });
      failures = 0;
      retryAfter = 0;
      return result;
    } catch (error) {
      failures++;
      retryAfter = Date.now() + Math.min(300000, 15000 * 2 ** Math.min(failures - 1, 5));
      setSetting(syncPrefix() + '_last_error', error.message);
      console.error('[calendar] public sync:', error.message);
      if (force) throw error;
      return { pending: true };
    } finally {
      busy = false;
    }
  };
  currentSync = tick;
  const timer = setInterval(() => void tick(), 60000);
  timer.unref();
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
    clearTimeout(changeTimer);
    if (currentSync === tick) currentSync = null;
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { path, snapshot } = exportSnapshot(process.argv[3] || undefined);
  console.log('Exported ' + snapshot.events.length + ' public entries to ' + path);
  if (process.argv.includes('--publish')) console.log(await publishSnapshot(resolve(path, '..')));
}
