import { data } from './connection.js';

let values = new Map();
let refreshing = false;
let generation = 0;
export async function refreshSettings() {
  if (refreshing) return;
  refreshing = true;
  const started = generation;
  try {
    const rows = await data.findMany('app_settings');
    if (generation === started) values = new Map(rows.map((row) => [row.key, row.value]));
  } finally {
    refreshing = false;
  }
}
await refreshSettings();
// Synchronous UI/config reads use a bounded cache; all writes await durable storage.
const refreshTimer =
  data.kind === 'mongodb'
    ? setInterval(() => {
        void refreshSettings().catch(() => console.error('[settings] refresh unavailable'));
      }, 2000)
    : null;
refreshTimer?.unref();

export function setting(key) {
  return values.get(key) ?? null;
}
export async function setSetting(key, value) {
  await data.upsert('app_settings', { key }, { value: String(value) });
  generation++;
  values.set(key, String(value));
}
