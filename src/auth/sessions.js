import { randomBytes, createHash } from 'node:crypto';
import { data } from '../database/connection.js';

export async function createSession(userId) {
  const token = randomBytes(32).toString('base64url');
  const csrf = randomBytes(24).toString('base64url');
  await data.insert('sessions', {
    token_hash: createHash('sha256').update(token).digest('hex'),
    user_id: userId,
    csrf,
    expires_at: Date.now() + 8 * 60 * 60 * 1000,
  });
  return { token, csrf };
}
export async function getSession(token) {
  if (!token) return null;
  const hash = createHash('sha256').update(token).digest('hex');
  const session = await data.findOne('sessions', { token_hash: hash });
  const user = session ? await data.findOne('users', { id: session.user_id }) : null;
  const row = session && user ? { ...session, ...user } : null;
  if (!row || row.expires_at < Date.now()) {
    await data.remove('sessions', { token_hash: hash });
    return null;
  }
  return {
    tokenHash: hash,
    csrf: row.csrf,
    user: { id: row.id, username: row.username, role: row.role, mustChange: !!row.must_change },
  };
}
export async function deleteSession(hash) {
  await data.remove('sessions', { token_hash: hash });
}
