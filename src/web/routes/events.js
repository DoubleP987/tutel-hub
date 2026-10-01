import { requestCalendarSync } from '../../calendar/publish.js';
import { listExpandedEvents, saveEvent, deleteEvent } from '../../calendar/service.js';
import { auth, admin, csrf } from '../middleware/security.js';

export function registerEventsRoutes(app) {
  app.get('/api/events', auth, (req, res) => {
    try {
      const events = listExpandedEvents(req.query.from, req.query.to, req.query.guild || null);
      res.json(events);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/events', auth, admin, csrf, (req, res) => {
    try {
      const { secretPin, id: ignoredId, ...event } = req.body;
      const id = saveEvent(event, req.auth.user.id);
      requestCalendarSync();
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.put('/api/events/:id', auth, admin, csrf, (req, res) => {
    try {
      const id = saveEvent({ ...req.body, id: req.params.id }, req.auth.user.id);
      requestCalendarSync();
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.delete('/api/events/:id', auth, admin, csrf, (req, res) => {
    try {
      deleteEvent(req.params.id);
      requestCalendarSync();
      res.json({ ok: true });
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  });
}
