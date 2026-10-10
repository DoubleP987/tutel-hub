import { publicSyncStatus } from '../../integrations/calendar/legacy/publish.js';
import { checkCalendarSetupPin } from '../../integrations/calendar/legacy/setup-pin.js';
import { setting, setSetting } from '../../database/settings.js';
import {
  listExpandedEvents,
  saveGuildConfig,
  listGuildConfigs,
} from '../../integrations/calendar/legacy/service.js';
import { getCalendarDiscordClient } from '../../bot/runtime.js';
import { canSendReminders, sendableChannels } from '../channels.js';
import { sendDailyCalendarSummary } from '../../integrations/calendar/legacy/notifications.js';
import {
  calendarDay,
  dailySummaryEvents,
} from '../../integrations/calendar/legacy/daily-summary.js';
import {
  reminderOptions,
  saveReminderOptions,
  normalizeOptions,
} from '../../integrations/calendar/legacy/options.js';
import { categories } from '../../integrations/calendar/legacy/categories.js';
import { auth, admin, csrf } from '../middleware/security.js';
import { forwardActiveBot } from '../../cluster/jobs.js';

export function registerDiscordRoutes(app) {
  app.get('/api/guilds', auth, admin, forwardActiveBot, async (req, res) => {
    const client = getCalendarDiscordClient();

    if (!client?.isReady()) {
      return res.status(503).json({ error: 'บอทยังไม่ออนไลน์ เปิดบอทในหน้าควบคุมบอทก่อน' });
    }

    const guilds = client
      ? Array.from(client.guilds.cache.values()).map((g) => ({ id: g.id, name: g.name }))
      : [];
    res.json({
      guilds,
      configs: (await listGuildConfigs()).map((c) => ({
        ...c,
        options: reminderOptions(c.guild_id),
      })),
      categories,
      publicCalendarUrl:
        setting('public_calendar_url') ||
        process.env.PUBLIC_CALENDAR_URL ||
        'https://cskru.netlify.app',
      netlify: publicSyncStatus(),
    });
  });

  app.get('/api/guilds/:id/channels', auth, admin, forwardActiveBot, async (req, res) => {
    const client = getCalendarDiscordClient();
    const guild = client?.guilds.cache.get(req.params.id);

    if (!guild) {
      return res.status(404).json({ error: 'บอทยังไม่อยู่ใน server นี้' });
    }

    try {
      res.json({ channels: await sendableChannels(guild) });
    } catch (error) {
      console.error('[web] channels:', error.message);
      res.status(500).json({
        error: 'โหลด channel ไม่สำเร็จ ตรวจสิทธิ์ View Channels และ Send Messages ของบอท',
      });
    }
  });

  app.post('/api/settings/discord', auth, admin, csrf, forwardActiveBot, async (req, res) => {
    const previous = (await listGuildConfigs()).find(
      (c) => c.guild_id === String(req.body.guildId),
    );

    if (previous?.channel_id !== String(req.body.channelId)) {
      const pinError = checkCalendarSetupPin(req.body.secretPin, 'web:' + req.auth.user.id);

      if (pinError) {
        return res.status(403).json({ error: pinError });
      }
    }

    try {
      const options = normalizeOptions(req.body.options || {});
      const client = getCalendarDiscordClient();
      const guild = client?.guilds.cache.get(String(req.body.guildId || ''));

      if (!client?.isReady() || !guild) {
        return res.status(400).json({ error: 'บอทยังไม่ออนไลน์หรือไม่อยู่ใน server นี้' });
      }

      if (!guild.members.me) {
        await guild.members.fetchMe();
      }

      const channel = await guild.channels.fetch(String(req.body.channelId || ''));

      if (!canSendReminders(channel, guild)) {
        return res
          .status(400)
          .json({ error: 'บอทต้องมีสิทธิ์ View Channels และ Send Messages ใน text channel นี้' });
      }

      if (req.body.publicCalendarUrl) {
        const url = new URL(req.body.publicCalendarUrl);

        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
          throw new Error('URL ปฏิทินต้องเป็น http หรือ https');
        }

        await setSetting('public_calendar_url', url.origin);
      }

      await saveGuildConfig(guild.id, guild.name, channel.id, req.body.defaultReminder);
      await saveReminderOptions(guild.id, options);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/settings/discord/test', auth, admin, csrf, forwardActiveBot, async (req, res) => {
    try {
      const config = (await listGuildConfigs()).find(
        (c) => c.guild_id === String(req.body.guildId),
      );

      if (!config?.channel_id) {
        throw new Error('บันทึก channel ก่อนส่งทดสอบ');
      }

      const client = getCalendarDiscordClient();

      if (!client?.isReady()) {
        throw new Error('บอทยังไม่ออนไลน์');
      }

      const day = calendarDay();
      const options = reminderOptions(config.guild_id);
      const events = dailySummaryEvents(
        await listExpandedEvents(day.startsAt, day.endsAt, config.guild_id),
        day,
        config,
        options,
      );
      const result = await sendDailyCalendarSummary(client, config, day, events, options, {
        test: true,
      });
      res.json({ ok: true, count: events.length, ...result });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}
