import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
const source = resolve(process.env.DATABASE_PATH || './data/tutel.sqlite');
if (process.env.DATABASE_PROVIDER === 'mongodb') {
  const { createDataStore } = await import('../src/database/store.js');
  const data = await createDataStore();
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const destination = resolve(process.argv[2] || './backups/tutel-' + stamp + '.json');
    mkdirSync(dirname(destination), { recursive: true });
    const tables = [
      'users',
      'sessions',
      'events',
      'guild_config',
      'reminder_log',
      'app_settings',
      'calendar_deliveries',
      'calendar_latest',
    ];
    const collections = {};
    for (const table of tables) collections[table] = await data.findMany(table);
    writeFileSync(
      destination,
      JSON.stringify({
        provider: 'mongodb',
        version: 1,
        createdAt: new Date().toISOString(),
        collections,
      }),
      { flag: 'wx', mode: 0o600 },
    );
    console.log('Private MongoDB logical backup saved: ' + destination);
  } finally {
    await data.close();
  }
  process.exit(0);
}
if (!existsSync(source)) throw new Error('Database does not exist: ' + source);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = resolve(process.argv[2] || './backups/tutel-' + stamp + '.sqlite');
if (existsSync(output)) throw new Error('Backup destination already exists.');
mkdirSync(dirname(output), { recursive: true });
const database = new DatabaseSync(source);
try {
  database.exec('PRAGMA busy_timeout=5000;');
  database.exec("VACUUM INTO '" + output.replaceAll("'", "''") + "'");
  console.log('SQLite backup saved: ' + output);
} finally {
  database.close();
}
