import { publicSyncStatus } from '../../calendar/publish.js';
import { checkCalendarSetupPin } from '../../calendar/setup-pin.js';
import { setting, setSetting } from '../../calendar/db.js';
import { listExpandedEvents, saveGuildConfig, listGuildConfigs } from '../../calendar/service.js';
import { getDiscordClient } from '../../bot/runtime.js';
import { canSendReminders, sendableChannels } from '../channels.js';
import { sendCalendarNotification } from '../../calendar/notifications.js';
import { reminderOptions, saveReminderOptions, normalizeOptions } from '../../calendar/options.js';
import { categories } from '../../calendar/categories.js';
import { auth, admin, csrf } from '../middleware/security.js';

export function registerDiscordRoutes(app) {
  app.get('/api/guilds', auth, admin, (req, res) => {
    const client = getDiscordClient();
    if (!client?.isReady())
      return res.status(503).json({ error: 'บอทยังไม่ออนไลน์ เปิดบอทในหน้าควบคุมบอทก่อน' });
    const guilds = client
      ? Array.from(client.guilds.cache.values()).map((g) => ({ id: g.id, name: g.name }))
      : [];
    res.json({
      guilds,
      configs: listGuildConfigs().map((c) => ({ ...c, options: reminderOptions(c.guild_id) })),
      categories,
      publicCalendarUrl:
        setting('public_calendar_url') ||
        process.env.PUBLIC_CALENDAR_URL ||
        'https://cskru.netlify.app',
      netlify: publicSyncStatus(),
    });
  });
  app.get('/api/guilds/:id/channels', auth, admin, async (req, res) => {
    const client = getDiscordClient(),
      guild = client?.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'บอทยังไม่อยู่ใน server นี้' });
    try {
      res.json({ channels: await sendableChannels(guild) });
    } catch (error) {
      console.error('[web] channels:', error.message);
      res.status(500).json({
        error: 'โหลด channel ไม่สำเร็จ ตรวจสิทธิ์ View Channels และ Send Messages ของบอท',
      });
    }
  });
  app.post('/api/settings/discord', auth, admin, csrf, async (req, res) => {
    const previous = listGuildConfigs().find((c) => c.guild_id === String(req.body.guildId));
    if (previous?.channel_id !== String(req.body.channelId)) {
      const pinError = checkCalendarSetupPin(req.body.secretPin, 'web:' + req.auth.user.id);
      if (pinError) return res.status(403).json({ error: pinError });
    }
    try {
      const options = normalizeOptions(req.body.options || {});
      const client = getDiscordClient(),
        guild = client?.guilds.cache.get(String(req.body.guildId || ''));
      if (!client?.isReady() || !guild)
        return res.status(400).json({ error: 'บอทยังไม่ออนไลน์หรือไม่อยู่ใน server นี้' });
      if (!guild.members.me) await guild.members.fetchMe();
      const channel = await guild.channels.fetch(String(req.body.channelId || ''));
      if (!canSendReminders(channel, guild))
        return res
          .status(400)
          .json({ error: 'บอทต้องมีสิทธิ์ View Channels และ Send Messages ใน text channel นี้' });
      if (req.body.publicCalendarUrl) {
        const url = new URL(req.body.publicCalendarUrl);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password)
          throw new Error('URL ปฏิทินต้องเป็น http หรือ https');
        setSetting('public_calendar_url', url.origin);
      }
      saveGuildConfig(guild.id, guild.name, channel.id, req.body.defaultReminder);
      saveReminderOptions(guild.id, options);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  app.post('/api/settings/discord/test', auth, admin, csrf, async (req, res) => {
    try {
      const config = listGuildConfigs().find((c) => c.guild_id === String(req.body.guildId));
      if (!config?.channel_id) throw new Error('บันทึก channel ก่อนส่งทดสอบ');
      const client = getDiscordClient();
      if (!client?.isReady()) throw new Error('บอทยังไม่ออนไลน์');
      const event = listExpandedEvents(
        new Date(),
        new Date(Date.now() + 30 * 86400000),
        config.guild_id,
      )[0];
      if (!event) throw new Error('ไม่มีรายการปฏิทินสำหรับทดสอบ');
      await sendCalendarNotification(
        client,
        config,
        { ...event, title: 'ทดสอบปฏิทิน: ' + event.title },
        { at: event.occurrence_at, end: event.occurrence_end },
        { key: 'test:' + Date.now(), label: 'ทดสอบระบบ' },
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
}
