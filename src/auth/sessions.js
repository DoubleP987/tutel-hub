import { randomBytes, createHash } from 'node:crypto';
import { db } from '../database/connection.js';

export function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  db.prepare('INSERT INTO sessions(token_hash,user_id,csrf,expires_at) VALUES(?,?,?,?)').run(
    createHash('sha256').update(token).digest('hex'),
    userId,
    csrf,
    Date.now() + 8 * 60 * 60 * 1000,
  );
  return { token, csrf };
}
export function getSession(token) {
  if (!token) return null;
  const hash = createHash('sha256').update(token).digest('hex');
  const row = db
    .prepare(
      'SELECT s.csrf,s.expires_at,u.id,u.username,u.role,u.must_change FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=?',
    )
    .get(hash);
  if (!row || row.expires_at < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash);
    return null;
  }
  return {
    tokenHash: hash,
    csrf: row.csrf,
    user: { id: row.id, username: row.username, role: row.role, mustChange: !!row.must_change },
  };
}
export function deleteSession(hash) {
  db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash);
}
