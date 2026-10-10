import express from 'express';
import helmet from 'helmet';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { registerCalendarAdmin } from './routes/calendar-admin.js';
import { registerPagesRoutes } from './routes/pages.js';
import { registerAuthenticationRoutes } from './routes/authentication.js';
import { registerEventsRoutes } from './routes/events.js';
import { registerPreferencesRoutes } from './routes/preferences.js';
import { registerAssetsRoutes } from './routes/assets.js';
import { registerCalendarSyncRoutes } from './routes/calendar-sync.js';
import { registerDiscordRoutes } from './routes/discord.js';
import { registerBotRoutes } from './routes/bot.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerClusterRoutes } from './routes/cluster.js';

const app = express(),
  here = fileURLToPath(new URL('.', import.meta.url));
app.set('trust proxy', 'loopback');
app.disable('x-powered-by');
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,
      },
    },
  }),
);
app.use(express.json({ limit: '256kb' }));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
const publicPath = resolve(here, 'public');
registerPagesRoutes(app, publicPath);
registerAuthenticationRoutes(app);
registerEventsRoutes(app);
registerPreferencesRoutes(app);
registerAssetsRoutes(app, publicPath);
registerCalendarSyncRoutes(app);
registerDiscordRoutes(app);
registerBotRoutes(app);
registerHealthRoutes(app);
registerClusterRoutes(app);
registerCalendarAdmin(app);

export function publicEvent(e) {
  const {
    id,
    title,
    description,
    all_day,
    holiday,
    publicHoliday,
    recurrence,
    starts_at,
    ends_at,
    occurrence_at,
    occurrence_end,
    systemHoliday,
  } = e;
  return {
    id,
    title,
    description,
    all_day,
    holiday,
    publicHoliday,
    recurrence,
    starts_at,
    ends_at,
    occurrence_at,
    occurrence_end,
    systemHoliday,
  };
}
export { app };
export async function startControlServer() {
  const port = Number(process.env.CONTROL_PORT || 3000);
  const server = app.listen(port, process.env.CONTROL_HOST || '127.0.0.1', () =>
    console.log('[web] control panel listening on ' + port),
  );
  return server;
}
