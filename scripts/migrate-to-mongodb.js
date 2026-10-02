import 'dotenv/config';
import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { createDataStore } from '../src/database/store.js';

// Run with the application stopped and a consistent SQLite backup as the source.
// Existing MongoDB records are never overwritten; mismatches abort the migration.
if (process.env.DATABASE_PROVIDER !== 'mongodb') throw new Error('Set DATABASE_PROVIDER=mongodb');
const sourcePath = process.argv[2];
if (!sourcePath)
  throw new Error('Usage: node scripts/migrate-to-mongodb.js /private/backup.sqlite');
const source = new DatabaseSync(sourcePath, { readOnly: true });
const target = await createDataStore();
const keys = {
  users: ['id'],
  sessions: ['token_hash'],
  events: ['id'],
  guild_config: ['guild_id'],
  reminder_log: ['event_id', 'occurrence_at', 'offset_minutes'],
  app_settings: ['key'],
  calendar_deliveries: ['id'],
  calendar_latest: ['channel_id'],
};
function fingerprint(rows) {
  return createHash('sha256')
    .update(
      JSON.stringify(
        rows
          .map((row) => Object.fromEntries(Object.entries(row).sort()))
          .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      ),
    )
    .digest('hex');
}
try {
  for (const [table, fields] of Object.entries(keys)) {
    const rows = source.prepare(`SELECT * FROM ${table}`).all();
    for (const row of rows) {
      const key = Object.fromEntries(fields.map((field) => [field, row[field]]));
      const existing = await target.findOne(table, key);
      if (existing && fingerprint([existing]) !== fingerprint([row]))
        throw new Error(`Existing ${table} record differs; stop and inspect backups`);
      await target.insertIfMissing(table, key, row);
    }
    const migrated = await target.findMany(table);
    if (fingerprint(rows) !== fingerprint(migrated))
      throw new Error(`Verification failed for ${table}`);
    console.log(`${table}: ${rows.length} rows; content verification OK`);
    if (table === 'users' || table === 'events')
      await target.database
        .collection('counters')
        .updateOne(
          { _id: table },
          { $max: { value: Math.max(0, ...rows.map((row) => row.id)) } },
          { upsert: true },
        );
  }
  console.log(
    'Migration complete: all source tables matched. Original SQLite backup remains intact.',
  );
} finally {
  source.close();
  await target.close();
}
