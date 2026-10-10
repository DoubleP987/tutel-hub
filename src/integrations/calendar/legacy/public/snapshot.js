import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve } from 'node:path';
import { listExpandedEvents, localDateTimeToIso } from '../service.js';

export function publicEvent(e) {
  const {
    id,
    title,
    description,
    all_day,
    holiday,
    publicHoliday,
    recurrence,
    starts_at,
    ends_at,
    occurrence_at,
    occurrence_end,
    systemHoliday,
    categories,
    color,
  } = e;
  return {
    id,
    title,
    description,
    all_day,
    holiday,
    publicHoliday,
    recurrence,
    starts_at,
    ends_at,
    occurrence_at,
    occurrence_end,
    systemHoliday,
    categories,
    color,
  };
}
export async function buildSnapshot(now = new Date()) {
  const year = Number(
    new Intl.DateTimeFormat('en', { timeZone: 'Asia/Bangkok', year: 'numeric' }).format(now),
  );
  const events = new Map();
  for (let y = year - 1; y <= year + 2; y++) {
    for (const e of await listExpandedEvents(
      localDateTimeToIso(y + '-01-01 00:00'),
      localDateTimeToIso(y + 1 + '-01-01 00:00'),
    )) {
      events.set(e.id + '|' + e.occurrence_at, publicEvent(e));
    }
  }
  return {
    timezone: 'Asia/Bangkok',
    from: year - 1 + '-01-01',
    to: year + 3 + '-01-01',
    generatedAt: now.toISOString(),
    events: [...events.values()].sort((a, b) => a.occurrence_at.localeCompare(b.occurrence_at)),
  };
}
export async function exportSnapshot(
  directory = process.env.PUBLIC_SITE_DIR || resolve('netlify-public'),
) {
  mkdirSync(directory, { recursive: true });
  const snapshot = await buildSnapshot(),
    data = JSON.stringify({ ...snapshot, generatedAt: undefined });
  const path = resolve(directory, 'calendar.json');
  if (existsSync(path)) {
    try {
      const old = JSON.parse(readFileSync(path, 'utf8'));
      if (JSON.stringify({ ...old, generatedAt: undefined }) === data)
        return { snapshot: old, path };
    } catch {}
  }
  writeFileSync(path + '.tmp', JSON.stringify(snapshot));
  renameSync(path + '.tmp', path);
  return { snapshot, path };
}
