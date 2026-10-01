import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { db } from '../database/connection.js';
import { hashPassword } from './passwords.js';

export function initializeAccounts() {
  const count = db.prepare('SELECT COUNT(*) n FROM users WHERE role=?').get('admin').n;
  if (!count) {
    const initial =
      process.env.ADMIN_INITIAL_PASSWORD?.trim() || randomBytes(18).toString('base64url');
    if (initial.length < 10)
      throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 10 characters.');
    db.prepare('INSERT INTO users(username,password_hash,role,must_change) VALUES(?,?,?,1)').run(
      'admin',
      hashPassword(initial),
      'admin',
    );
    if (!process.env.ADMIN_INITIAL_PASSWORD?.trim()) {
      const directory = process.env.DATA_DIR || './data';
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        directory + '/admin-initial-password.txt',
        'username: admin\npassword: ' + initial + '\nChange after first login.\n',
        { mode: 0o600 },
      );
      console.log('Initial admin credentials saved inside the private data directory.');
    }
  }
  const viewer = db.prepare('SELECT id FROM users WHERE username=?').get('viewer');
  if (!viewer) {
    const initial = randomBytes(12).toString('base64url');
    db.prepare('INSERT INTO users(username,password_hash,role,must_change) VALUES(?,?,?,1)').run(
      'viewer',
      hashPassword(initial),
      'viewer',
    );
    mkdirSync(process.env.DATA_DIR || './data', { recursive: true });
    const path = (process.env.DATA_DIR || './data') + '/viewer-initial-password.txt';
    if (!existsSync(path)) {
      writeFileSync(
        path,
        'username: viewer\npassword: ' + initial + '\nChange this password after first login.\n',
        { mode: 0o600, flag: 'wx' },
      );
      chmodSync(path, 0o600);
      console.log('Created viewer account; one-time credentials saved to ' + path);
    }
  }
  db.prepare("INSERT OR IGNORE INTO app_settings(key,value) VALUES('bot_enabled','1')").run();
}
export function userByName(username) {
  return db.prepare('SELECT * FROM users WHERE username=?').get(username);
}
export function changePassword(userId, password) {
  if (String(password).length < 10) throw new Error('รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร');
  db.prepare('UPDATE users SET password_hash=?,must_change=0 WHERE id=?').run(
    hashPassword(password),
    userId,
  );
  db.prepare('DELETE FROM sessions WHERE user_id=?').run(userId);
}
