import { randomBytes } from 'node:crypto';
import { mkdirSync, existsSync, writeFileSync, chmodSync } from 'node:fs';
import { data } from '../database/connection.js';
import { setSetting, setting } from '../database/settings.js';
import { hashPassword } from './passwords.js';

export async function initializeAccounts() {
  const count = await data.count('users', { role: 'admin' });

  if (!count) {
    const initial =
      process.env.ADMIN_INITIAL_PASSWORD?.trim() || randomBytes(18).toString('base64url');

    if (initial.length < 10) {
      throw new Error('ADMIN_INITIAL_PASSWORD must contain at least 10 characters.');
    }

    await data.insert('users', {
      username: 'admin',
      password_hash: hashPassword(initial),
      role: 'admin',
      must_change: 1,
    });

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

  const viewer = await data.findOne('users', { username: 'viewer' });

  if (!viewer) {
    const initial = randomBytes(12).toString('base64url');
    await data.insert('users', {
      username: 'viewer',
      password_hash: hashPassword(initial),
      role: 'viewer',
      must_change: 1,
    });
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

  if (setting('bot_enabled') === null) {
    await setSetting('bot_enabled', '1');
  }
}

export async function userByName(username) {
  return data.findOne('users', { username });
}

export async function changePassword(userId, password) {
  if (String(password).length < 10) {
    throw new Error('รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร');
  }

  await data.update(
    'users',
    { id: userId },
    { password_hash: hashPassword(password), must_change: 0 },
  );
  await data.remove('sessions', { user_id: userId });
}
