import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { getSession } from '../../calendar/db.js';
import { cookies } from '../middleware/security.js';

export function registerPagesRoutes(app, publicPath) {
  app.get('/login', (req, res) => {
    let token = cookies(req).tutel_pre;
    if (!token) {
      token = randomBytes(24).toString('base64url');
      const c = [
        'tutel_pre=' + encodeURIComponent(token),
        'Path=/',
        'SameSite=Strict',
        'Max-Age=900',
      ];
      if (req.secure) c.push('Secure');
      res.append('Set-Cookie', c.join('; '));
    }
    res.sendFile(resolve(publicPath, 'login.html'));
  });
  app.get('/login.js', (req, res) => res.sendFile(resolve(publicPath, 'login.js')));
  app.get('/app.js', (req, res) => res.sendFile(resolve(publicPath, 'app.js')));
  app.get('/app.css', (req, res) => res.sendFile(resolve(publicPath, 'app.css')));
  app.get('/', (req, res) => {
    const s = getSession(cookies(req).tutel_sid);
    res.redirect(s?.user.role === 'viewer' ? '/viewer' : s ? '/admin' : '/login');
  });
  app.get('/admin', (req, res) => {
    const s = getSession(cookies(req).tutel_sid);
    if (!s) return res.redirect('/login');
    if (s.user.role !== 'admin') return res.redirect('/viewer');
    res.sendFile(resolve(publicPath, 'app.html'));
  });
  app.get('/viewer', (req, res) => {
    const s = getSession(cookies(req).tutel_sid);
    if (!s) return res.redirect('/login');
    if (s.user.role !== 'viewer') return res.redirect('/admin');
    res.sendFile(resolve(publicPath, 'app.html'));
  });
}
