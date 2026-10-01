import { publicSyncStatus, syncCalendarNow } from '../../calendar/publish.js';
import { auth, admin, csrf } from '../middleware/security.js';

export function registerCalendarSyncRoutes(app) {
  app.get('/api/calendar-sync', auth, admin, (req, res) => res.json(publicSyncStatus()));
  app.post('/api/calendar-sync', auth, admin, csrf, async (req, res) => {
    try {
      const result = await syncCalendarNow();
      res.json({ ...result, status: publicSyncStatus() });
    } catch (error) {
      res.status(502).json({ error: error.message, status: publicSyncStatus() });
    }
  });
}
