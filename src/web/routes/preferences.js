import { setting, setSetting } from '../../database/settings.js';
import { categories } from '../../integrations/calendar/legacy/categories.js';
import { auth, csrf } from '../middleware/security.js';

export function registerPreferencesRoutes(app) {
  app.get('/api/preferences', auth, (req, res) => {
    let prefs = {};
    try {
      prefs = JSON.parse(setting('preferences:' + req.auth.user.id) || '{}');
    } catch {}
    res.json(prefs);
  });
  app.put('/api/preferences', auth, csrf, async (req, res) => {
    const input = req.body,
      theme = ['system', 'light', 'dark'].includes(input.theme) ? input.theme : 'system';
    const filters = Array.isArray(input.filters)
      ? input.filters.filter((id) => categories.some((c) => c.id === id))
      : categories.map((c) => c.id);
    await setSetting('preferences:' + req.auth.user.id, JSON.stringify({ theme, filters }));
    res.json({ ok: true });
  });
}
