import { createSession, deleteSession } from '../../auth/sessions.js';
import { userByName, changePassword } from '../../auth/accounts.js';
import { verifyPassword } from '../../auth/passwords.js';
import {
  cookies,
  clearCookie,
  auth,
  admin,
  csrf,
  setSessionCookie,
} from '../middleware/security.js';

const loginLimits = new Map();

export function registerAuthenticationRoutes(app) {
  app.post('/api/login', async (req, res) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const attempt = loginLimits.get(ip) || { count: 0, until: 0 };

    if (attempt.until > now) {
      return res.status(429).json({ error: 'ลองเข้าสู่ระบบใหม่ภายหลัง' });
    }

    if (attempt.count >= 8 && attempt.until < now) {
      attempt.count = 0;
      attempt.until = now + 15 * 60 * 1000;
    }

    const pre = cookies(req).tutel_pre;

    if (!pre || req.body.csrf !== pre) {
      return res.status(403).json({ error: 'โหลดหน้าใหม่แล้วลองอีกครั้ง' });
    }

    const user = await userByName(String(req.body.username || '').trim());

    if (!user || !verifyPassword(req.body.password || '', user.password_hash)) {
      attempt.count++;

      if (attempt.count >= 8) {
        attempt.until = now + 15 * 60 * 1000;
      }

      loginLimits.set(ip, attempt);
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    loginLimits.delete(ip);
    const session = await createSession(user.id);
    setSessionCookie(res, session.token, req.secure);
    clearCookie(res, 'tutel_pre', false, req.secure);
    res.json({
      role: user.role,
      mustChange: !!user.must_change,
      redirect: user.role === 'viewer' ? '/viewer' : '/admin',
    });
  });

  app.get('/api/session', auth, (req, res) =>
    res.json({ user: req.auth.user, csrf: req.auth.csrf }),
  );

  app.post('/api/logout', auth, csrf, async (req, res) => {
    await deleteSession(req.auth.tokenHash);
    clearCookie(res, 'tutel_sid', true, req.secure);
    res.json({ ok: true });
  });

  app.post('/api/password', auth, csrf, async (req, res) => {
    try {
      if (
        !verifyPassword(
          req.body.currentPassword || '',
          (await userByName(req.auth.user.username)).password_hash,
        )
      ) {
        return res.status(401).json({ error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
      }

      await changePassword(req.auth.user.id, req.body.newPassword || '');
      await deleteSession(req.auth.tokenHash);
      const session = await createSession(req.auth.user.id);
      setSessionCookie(res, session.token, req.secure);
      res.json({ ok: true, csrf: session.csrf, mustChange: false });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}
