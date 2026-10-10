export function initializeSchema(db) {
  db.exec(`
PRAGMA journal_mode=WAL;

PRAGMA synchronous=NORMAL;

PRAGMA foreign_keys=ON;

PRAGMA busy_timeout=5000;
`);
  db.exec(`
    CREATE TABLE IF NOT EXISTS users ( id INTEGER PRIMARY KEY,
       username TEXT NOT NULL UNIQUE,
       password_hash TEXT NOT NULL,
       role TEXT NOT NULL CHECK(role IN ('admin',
       'viewer')),
       must_change INTEGER NOT NULL DEFAULT 0,
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE IF NOT EXISTS sessions ( token_hash TEXT PRIMARY KEY,
       user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       csrf TEXT NOT NULL,
       expires_at INTEGER NOT NULL ); CREATE TABLE IF NOT EXISTS events ( id INTEGER PRIMARY KEY,
       guild_id TEXT,
       title TEXT NOT NULL,
       description TEXT NOT NULL DEFAULT '',
       starts_at TEXT NOT NULL,
       ends_at TEXT NOT NULL,
       all_day INTEGER NOT NULL DEFAULT 0,
       holiday INTEGER NOT NULL DEFAULT 0,
       recurrence TEXT NOT NULL DEFAULT 'none',
       reminders TEXT NOT NULL DEFAULT '[15]',
       created_by INTEGER REFERENCES users(id),
       created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP ); CREATE TABLE IF NOT EXISTS guild_config ( guild_id TEXT PRIMARY KEY,
       guild_name TEXT NOT NULL DEFAULT '',
       channel_id TEXT,
       default_reminder INTEGER NOT NULL DEFAULT 15,
       timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok' ); CREATE TABLE IF NOT EXISTS reminder_log ( event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
       occurrence_at TEXT NOT NULL,
       offset_minutes INTEGER NOT NULL,
       sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       PRIMARY KEY(event_id,
       occurrence_at,
       offset_minutes) ); CREATE TABLE IF NOT EXISTS app_settings ( key TEXT PRIMARY KEY,
       value TEXT NOT NULL ); CREATE INDEX IF NOT EXISTS events_starts_idx ON events(starts_at); CREATE INDEX IF NOT EXISTS events_guild_idx ON events(guild_id);
  `);

  if (
    !db
      .prepare('PRAGMA table_info(events)')
      .all()
      .some((c) => c.name === 'reminder_mode')
  ) {
    db.exec(`
ALTER TABLE events ADD COLUMN reminder_mode TEXT NOT NULL DEFAULT 'offsets'
`);
  }

  if (
    !db
      .prepare('PRAGMA table_info(events)')
      .all()
      .some((c) => c.name === 'color')
  ) {
    db.exec(`
ALTER TABLE events ADD COLUMN color TEXT NOT NULL DEFAULT '#4285f4'
`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_deliveries ( id TEXT PRIMARY KEY,
       guild_id TEXT NOT NULL,
       channel_id TEXT NOT NULL,
       event_key TEXT NOT NULL,
       occurrence_at TEXT NOT NULL,
       schedule_key TEXT NOT NULL,
       message_id TEXT,
       payload TEXT NOT NULL,
       active INTEGER NOT NULL DEFAULT 1,
       sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
       UNIQUE(guild_id,
       channel_id,
       event_key,
       occurrence_at,
       schedule_key) ); CREATE INDEX IF NOT EXISTS calendar_deliveries_channel ON calendar_deliveries(channel_id,
       active); CREATE TABLE IF NOT EXISTS calendar_latest ( channel_id TEXT PRIMARY KEY,
       message_id TEXT NOT NULL );
  `);
}
