import { setting, setSetting } from '../../calendar/db.js';
import { getDiscordClient, startBot, stopBot, botStatus } from '../../bot/runtime.js';
import {
  getPlayer,
  pausePlayer,
  resumePlayer,
  stop,
  skip,
  destroyPlayer,
} from '../../music/player.js';
import { auth, admin, csrf } from '../middleware/security.js';

export function registerBotRoutes(app) {
  app.get('/api/bot', auth, admin, (req, res) => {
    const client = getDiscordClient(),
      guilds = client ? Array.from(client.guilds.cache.values()) : [];
    res.json({
      status: botStatus(),
      configured: setting('bot_enabled') !== '0',
      guilds: guilds.map((g) => ({ id: g.id, name: g.name })),
      music: guilds.map((g) => {
        const s = getPlayer(g.id);
        return {
          guildId: g.id,
          guildName: g.name,
          playing: s?.radio?.name || s?.current?.title || null,
          paused: s?.player?.state?.status === 'paused',
          queue: s?.queue?.length || 0,
          voiceChannelId: s?.connection?.joinConfig?.channelId || null,
        };
      }),
    });
  });
  app.post('/api/bot/toggle', auth, admin, csrf, async (req, res) => {
    const enable = !!req.body.enabled;
    try {
      if (enable) await startBot();
      else await stopBot();
      setSetting('bot_enabled', enable ? '1' : '0');
      res.json({ ok: true, status: botStatus() });
    } catch (error) {
      res.status(500).json({ error: 'สั่งเปลี่ยนสถานะบอทไม่สำเร็จ: ' + error.message });
    }
  });
  app.post('/api/control/music', auth, admin, csrf, (req, res) => {
    const guildId = String(req.body.guildId || ''),
      action = String(req.body.action || ''),
      state = getPlayer(guildId);
    if (!state) return res.status(404).json({ error: 'ไม่มี player สำหรับ server นี้' });
    if (action === 'pause') pausePlayer(guildId);
    else if (action === 'resume') resumePlayer(guildId);
    else if (action === 'skip') {
      if (!skip(guildId)) return res.status(400).json({ error: 'ไม่มีเพลงให้ข้าม' });
    } else if (action === 'stop') stop(guildId);
    else if (action === 'leave') destroyPlayer(guildId);
    else return res.status(400).json({ error: 'คำสั่งไม่รองรับ' });
    res.json({ ok: true });
  });
}
