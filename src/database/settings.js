import { db } from './connection.js';

export function setting(key) {
  return db.prepare('SELECT value FROM app_settings WHERE key=?').get(key)?.value ?? null;
}
export function setSetting(key, value) {
  db.prepare(
    'INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value',
  ).run(key, String(value));
}
