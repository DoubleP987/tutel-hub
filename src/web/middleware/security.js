import { timingSafeEqual } from 'node:crypto';
import { getSession } from '../../auth/sessions.js';

export function cookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || '')
      .split(';')
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => {
        const i = x.indexOf('=');
        return [decodeURIComponent(x.slice(0, i)), decodeURIComponent(x.slice(i + 1))];
      }),
  );
}
export function clearCookie(res, name, httpOnly = true, secure = true) {
  const parts = [name + '=', 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (httpOnly) parts.push('HttpOnly');
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
export async function auth(req, res, next) {
  const c = cookies(req),
    session = await getSession(c.tutel_sid);
  if (!session) return res.status(401).json({ error: 'กรุณาเข้าสู่ระบบ' });
  req.auth = session;
  next();
}
export function admin(req, res, next) {
  if (req.auth.user.role !== 'admin')
    return res.status(403).json({ error: 'บัญชีนี้ดูได้อย่างเดียว' });
  if (req.auth.user.mustChange && !req.path.startsWith('/api/password'))
    return res.status(428).json({ error: 'กรุณาเปลี่ยนรหัสผ่านก่อน' });
  next();
}
export function csrf(req, res, next) {
  const header = req.get('x-csrf-token') || '';
  const expected = req.auth?.csrf || '';
  if (
    !header ||
    !expected ||
    header.length !== expected.length ||
    !timingSafeEqual(Buffer.from(header), Buffer.from(expected))
  )
    return res.status(403).json({ error: 'CSRF token ไม่ถูกต้อง' });
  next();
}
export function setSessionCookie(res, token, secure) {
  const parts = [
    'tutel_sid=' + encodeURIComponent(token),
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=28800',
  ];
  if (secure) parts.push('Secure');
  res.append('Set-Cookie', parts.join('; '));
}
