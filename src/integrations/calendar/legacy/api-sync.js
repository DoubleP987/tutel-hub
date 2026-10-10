import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setting, setSetting } from '../../../database/settings.js';
export async function syncCalendarApi(directory, { request = fetch, force = false } = {}) {
  const endpoint = process.env.CALENDAR_SYNC_URL?.trim(),
    secret = process.env.CALENDAR_SYNC_SECRET?.trim();
  if (!endpoint || !secret) return { pending: true, provider: 'calendar-api' };
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new Error('Calendar sync requires an HTTPS URL.');
  const snapshot = JSON.parse(readFileSync(resolve(directory, 'calendar.json'), 'utf8'));
  const content = {
    timezone: snapshot.timezone,
    from: snapshot.from,
    to: snapshot.to,
    events: snapshot.events,
  };
  const hash = createHash('sha256').update(JSON.stringify(content)).digest('hex');
  if (
    !force &&
    setting('calendar_api_hash') === hash &&
    setting('calendar_api_endpoint') === endpoint
  )
    return { unchanged: true, provider: 'calendar-api' };
  let revision = Number(setting('calendar_api_pending_revision') || 0);
  if (setting('calendar_api_pending_hash') !== hash || !revision) {
    revision = Math.max(
      Date.now(),
      Number(setting('calendar_api_revision') || 0) + 1,
      revision + 1,
    );
    await setSetting('calendar_api_pending_hash', hash);
    await setSetting('calendar_api_pending_revision', String(revision));
  }
  const response = await request(url, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...content,
      schemaVersion: 1,
      revision,
      generatedAt: snapshot.generatedAt,
    }),
    signal: AbortSignal.timeout(30000),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409 && Number.isSafeInteger(result.revision)) {
    await setSetting('calendar_api_pending_revision', String(result.revision + 1));
    throw new Error('Newer public calendar detected; retrying with a newer revision.');
  }
  if (!response.ok || !result.ok)
    throw new Error(
      'Calendar sync HTTP ' + response.status + ': ' + (result.error || 'request rejected'),
    );
  await setSetting('calendar_api_hash', hash);
  await setSetting('calendar_api_endpoint', endpoint);
  await setSetting('calendar_api_revision', String(revision));
  await setSetting('calendar_api_last_sync_at', new Date().toISOString());
  await setSetting('calendar_api_last_error', '');
  return { ready: true, provider: 'calendar-api', revision, count: snapshot.events.length };
}
