import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

const databasePath = process.env.DATABASE_PATH || './data/tutel.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });
export const db = new DatabaseSync(databasePath);
db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
db.exec("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','viewer')), must_change INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, guild_id TEXT, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, all_day INTEGER NOT NULL DEFAULT 0, holiday INTEGER NOT NULL DEFAULT 0, recurrence TEXT NOT NULL DEFAULT 'none', reminders TEXT NOT NULL DEFAULT '[15]', created_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP); CREATE TABLE IF NOT EXISTS guild_config (guild_id TEXT PRIMARY KEY, guild_name TEXT NOT NULL DEFAULT '', channel_id TEXT, default_reminder INTEGER NOT NULL DEFAULT 15, timezone TEXT NOT NULL DEFAULT 'Asia/Bangkok'); CREATE TABLE IF NOT EXISTS reminder_log (event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE, occurrence_at TEXT NOT NULL, offset_minutes INTEGER NOT NULL, sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(event_id, occurrence_at, offset_minutes)); CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL); CREATE INDEX IF NOT EXISTS events_starts_idx ON events(starts_at); CREATE INDEX IF NOT EXISTS events_guild_idx ON events(guild_id);");

if (!db.prepare('PRAGMA table_info(events)').all().some(c=>c.name==='reminder_mode')) {
 db.exec("ALTER TABLE events ADD COLUMN reminder_mode TEXT NOT NULL DEFAULT 'offsets'");
}
if (!db.prepare('PRAGMA table_info(events)').all().some(c=>c.name==='color')) db.exec("ALTER TABLE events ADD COLUMN color TEXT NOT NULL DEFAULT '#4285f4'");
db.exec("CREATE TABLE IF NOT EXISTS calendar_deliveries (id TEXT PRIMARY KEY, guild_id TEXT NOT NULL, channel_id TEXT NOT NULL, event_key TEXT NOT NULL, occurrence_at TEXT NOT NULL, schedule_key TEXT NOT NULL, message_id TEXT, payload TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1, sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(guild_id,channel_id,event_key,occurrence_at,schedule_key)); CREATE INDEX IF NOT EXISTS calendar_deliveries_channel ON calendar_deliveries(channel_id,active); CREATE TABLE IF NOT EXISTS calendar_latest (channel_id TEXT PRIMARY KEY,message_id TEXT NOT NULL);");

function decode(value) {
 const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
 return Buffer.from(normalized, 'base64');
}
function encode(value) { return Buffer.from(value).toString('base64url'); }
export function hashPassword(password) {
 const salt = randomBytes(16);
 const derived = scryptSync(String(password), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 67108864 });
 return 'scrypt$32768$8$1$' + encode(salt) + '$' + encode(derived);
}
export function verifyPassword(password, packed) {
 try {
  const [algo,n,r,p,saltText,hashText] = packed.split('$');
  if (algo !== 'scrypt') return false;
  const expected = decode(hashText);
  const actual = scryptSync(String(password), decode(saltText), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: 67108864 });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
 } catch { return false; }
}
export function initializeAccounts() {
 const count = db.prepare('SELECT COUNT(*) n FROM users WHERE role=?').get('admin').n;
 if (!count) {
  const initial=process.env.ADMIN_INITIAL_PASSWORD?.trim() || randomBytes(18).toString('base64url');
  if(initial.length<10)throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 10 characters.');
  db.prepare('INSERT INTO users(username,password_hash,role,must_change) VALUES(?,?,?,1)').run('admin',hashPassword(initial),'admin');
  if(!process.env.ADMIN_INITIAL_PASSWORD?.trim()) {
   const directory=process.env.DATA_DIR||'./data';mkdirSync(directory,{recursive:true});
   writeFileSync(directory+'/admin-initial-password.txt','username: admin\npassword: '+initial+'\nChange after first login.\n',{mode:0o600});
   console.log('Initial admin credentials saved inside the private data directory.');
  }
 }
 const viewer = db.prepare('SELECT id FROM users WHERE username=?').get('viewer');
 if (!viewer) {
  const initial = randomBytes(12).toString('base64url');
  db.prepare('INSERT INTO users(username,password_hash,role,must_change) VALUES(?,?,?,1)').run('viewer',hashPassword(initial),'viewer');
  mkdirSync(process.env.DATA_DIR || './data',{recursive:true});
  const path = (process.env.DATA_DIR || './data') + '/viewer-initial-password.txt';
  if (!existsSync(path)) {
   writeFileSync(path, 'username: viewer\npassword: ' + initial + '\nChange this password after first login.\n', { mode: 0o600, flag: 'wx' });
   chmodSync(path,0o600);
   console.log('Created viewer account; one-time credentials saved to ' + path);
  }
 }
 db.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('bot_enabled','1')").run();
}
export function createSession(userId) {
 const token = randomBytes(32).toString('base64url');
 const csrf = randomBytes(24).toString('base64url');
 db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),userId,csrf,Date.now()+8*60*60*1000);
 return { token, csrf };
}
export function getSession(token) {
 if (!token) return null;
 const hash = createHash('sha256').update(token).digest('hex');
 const row = db.prepare('SELECT s.csrf,s.expires_at,u.id,u.username,u.role,u.must_change FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?').get(hash);
 if (!row || row.expires_at < Date.now()) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash); return null; }
 return { tokenHash:hash, csrf:row.csrf, user:{ id:row.id, username:row.username, role:row.role, mustChange:!!row.must_change } };
}
export function deleteSession(hash) { db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash); }
export function userByName(username) { return db.prepare('SELECT * FROM users WHERE username=?').get(username); }
export function changePassword(userId,password) {
 if (String(password).length < 10) throw new Error('รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร');
 db.prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?').run(hashPassword(password),userId);
 db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
}
export function setting(key) { return db.prepare('SELECT value FROM app_settings WHERE key=?').get(key)?.value ?? null; }
export function setSetting(key,value) { db.prepare('INSERT INTO app_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,String(value)); }
