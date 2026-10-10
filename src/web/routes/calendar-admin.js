import { calendarConfigured, calendarRequest } from '../../integrations/calendar/client.js';
import { auth, admin, csrf } from '../middleware/security.js';
import { getCalendarDiscordClient } from '../../bot/runtime.js';
import { PermissionFlagsBits } from 'discord.js';

const readPaths = [
  /^\/overview$/,
  /^\/catalog$/,
  /^\/groups$/,
  /^\/users$/,
  /^\/groups\/[a-zA-Z0-9-]+$/,
  /^\/jobs$/,
  /^\/audit$/,
  /^\/feedback$/,
  /^\/feedback\/[a-zA-Z0-9-]+$/,
  /^\/feedback\/images\/[a-zA-Z0-9-]+$/,
];
const writePaths = [
  /^\/groups\/[a-zA-Z0-9-]+$/,
  /^\/groups\/[a-zA-Z0-9-]+\/members\/[a-zA-Z0-9-]+$/,
  /^\/groups\/[a-zA-Z0-9-]+\/transfer$/,
  /^\/groups\/[a-zA-Z0-9-]+\/invitations(?:\/[a-zA-Z0-9-]+)?$/,
  /^\/groups\/[a-zA-Z0-9-]+\/bindings$/,
  /^\/groups\/[a-zA-Z0-9-]+\/events\/[a-zA-Z0-9:-]+(?:\/review)?$/,
  /^\/jobs\/[a-zA-Z0-9-]+\/retry$/,
  /^\/feedback\/[a-zA-Z0-9-]+$/,
];

export function registerCalendarAdmin(app) {
  app.get('/api/calendar-admin/config', auth, admin, (req, res) =>
    res.json({
      configured: calendarConfigured('control'),
      website: process.env.CALENDAR_WEB_URL || null,
    }),
  );

  app.use('/api/calendar-admin', auth, admin, async (req, res) => {
    const path = req.path;

    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
      return res.sendStatus(405);
    }

    if (!(req.method === 'GET' ? readPaths : writePaths).some((pattern) => pattern.test(path))) {
      return res.sendStatus(404);
    }

    if (req.method !== 'GET') {
      let allowed = false;
      csrf(req, res, () => {
        allowed = true;
      });

      if (!allowed) {
        return;
      }
    }

    try {
      if (req.method === 'GET' && /^\/feedback\/images\/[a-zA-Z0-9-]+$/.test(path)) {
        const bytes = await calendarRequest(path, { kind: 'control', image: true });
        return res
          .set({
            'Content-Type': 'image/webp',
            'Cache-Control': 'private, no-store',
            'X-Content-Type-Options': 'nosniff',
          })
          .send(bytes);
      }

      if (req.method === 'POST' && path.endsWith('/bindings')) {
        const previous = req.body.id
          ? (
              await calendarRequest(path.replace(/\/bindings$/, ''), { kind: 'control' })
            ).bindings.find((binding) => binding.id === req.body.id)
          : null;
        const sameDestination =
          previous &&
          previous.guild_id === String(req.body.guildId) &&
          previous.channel_id === String(req.body.channelId);

        if (!sameDestination) {
          const channel = await getCalendarDiscordClient()?.channels.fetch(
            String(req.body.channelId || ''),
          );
          const permissions = channel?.permissionsFor?.(getCalendarDiscordClient()?.user);

          if (
            !channel?.isTextBased() ||
            channel.guildId !== String(req.body.guildId) ||
            !permissions?.has([
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.EmbedLinks,
            ])
          ) {
            return res
              .status(400)
              .json({ error: 'บอทต้องอยู่ในเซิร์ฟเวอร์และมีสิทธิ์ส่งข้อความในช่องนี้' });
          }
        }
      }

      const queryParams = new URLSearchParams();

      if (req.method === 'GET') {
        for (const key of ['q', 'page', 'status', 'category']) {
          if (typeof req.query[key] === 'string') {
            queryParams.set(key, req.query[key].slice(0, 100));
          }
        }
      }

      const query = queryParams.size ? '?' + queryParams.toString() : '';
      res.json(
        await calendarRequest(path + query, {
          kind: 'control',
          method: req.method,
          body: req.method === 'GET' ? undefined : req.body,
          actor: req.auth.user.id || req.auth.user.username || 'admin',
        }),
      );
    } catch (error) {
      res
        .status(error.status >= 400 && error.status < 500 ? error.status : 503)
        .json({ error: error.message });
    }
  });
}
