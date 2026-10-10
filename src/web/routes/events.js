import { requestCalendarSync } from '../../integrations/calendar/legacy/publish.js';
import {
  listExpandedEvents,
  saveEvent,
  deleteEvent,
} from '../../integrations/calendar/legacy/service.js';
import { auth, admin, csrf } from '../middleware/security.js';

export function registerEventsRoutes(app) {
  app.get('/api/events', auth, async (req, res) => {
    try {
      const events = await listExpandedEvents(
        req.query.from,
        req.query.to,
        req.query.guild || null,
      );
      res.json(events);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/events', auth, admin, csrf, async (req, res) => {
    try {
      const { secretPin, id: ignoredId, ...event } = req.body;
      const id = await saveEvent(event, req.auth.user.id);
      requestCalendarSync();
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.put('/api/events/:id', auth, admin, csrf, async (req, res) => {
    try {
      const id = await saveEvent({ ...req.body, id: req.params.id }, req.auth.user.id);
      requestCalendarSync();
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.delete('/api/events/:id', auth, admin, csrf, async (req, res) => {
    try {
      await deleteEvent(req.params.id);
      requestCalendarSync();
      res.json({ ok: true });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
}
