import { createHash } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  escapeMarkdown,
} from 'discord.js';
import { calendarRequest, calendarConfigured } from './client.js';
import { canRunBot } from '../../cluster/state.js';
import { setting, setSetting } from '../../database/settings.js';

let managedGuilds = new Set();

export function groupCalendarGuild(guildId) {
  return managedGuilds.has(guildId);
}

function embed(job, budget = 3600) {
  const { payload } = job;
  const lines = payload.events.map(
    (event) => `${event.all_day ? 'ทั้งวัน' : event.time} · ${escapeMarkdown(event.title)}`,
  );
  let text = '';
  let shown = 0;

  for (const line of lines) {
    if (text.length + line.length + 100 > budget) {
      break;
    }

    text += (text ? '\n' : '') + line;
    shown++;
  }

  if (shown < lines.length) {
    text += `\nอีก ${lines.length - shown} รายการ · เปิดดูทั้งหมดในปฏิทิน`;
  }

  return new EmbedBuilder()
    .setTitle(
      `${payload.groupName} · ${payload.kind === 'before' ? 'กิจกรรมพรุ่งนี้' : payload.kind === 'event' ? 'กิจกรรมใกล้ถึง' : 'กิจกรรมวันนี้'}`,
    )
    .setDescription(text || 'เปิดปฏิทินเพื่อดูรายละเอียด')
    .setColor(payload.color)
    .setFooter({ text: `${payload.date} · เวลาไทย · Tutel by Double_P` });
}

export function startGroupCalendarWorker(getClient) {
  if (!calendarConfigured()) {
    return () => {};
  }

  let stopped = false;
  let running = false;

  async function tick() {
    const client = getClient();

    if (stopped || running || !client?.isReady() || !canRunBot()) {
      return;
    }

    running = true;

    try {
      const bindings = await calendarRequest('/bindings');
      managedGuilds = new Set(bindings.map((b) => b.guild_id));
      const { jobs } = await calendarRequest('/claim', {
        method: 'POST',
        body: { guildIds: [...client.guilds.cache.keys()] },
      });
      const batches = new Map();

      for (const job of jobs) {
        const key = `${job.guild_id}:${job.channel_id}:${job.payload.kind}:${job.payload.date}`;

        if (!batches.has(key)) {
          batches.set(key, []);
        }

        batches.get(key).push(job);
      }

      for (const batch of batches.values()) {
        if (stopped || !canRunBot()) {
          break;
        }

        const fresh = [];

        for (const job of batch) {
          const previous = setting(`calendar_job:${job.id}`);

          if (previous) {
            await calendarRequest(`/jobs/${job.id}/ack`, {
              method: 'POST',
              body: { claimToken: job.claimToken, messageId: previous },
            });
          } else {
            fresh.push(job);
          }
        }

        if (!fresh.length) {
          continue;
        }

        let channel;

        try {
          channel = await client.channels.fetch(fresh[0].channel_id);

          if (!channel?.isTextBased() || channel.guildId !== fresh[0].guild_id) {
            throw new Error('Calendar channel unavailable');
          }
        } catch (error) {
          for (const job of fresh) {
            await calendarRequest(`/jobs/${job.id}/ack`, {
              method: 'POST',
              body: {
                claimToken: job.claimToken,
                error: 'Channel unavailable; check bot permissions and binding',
              },
            }).catch(() => {});
          }

          console.warn('[calendar groups] channel unavailable:', error.message);
          continue;
        }
        // Five link buttons per row; reserve space under Discord's combined embed limit.
        for (let offset = 0; offset < fresh.length; offset += 5) {
          const packet = fresh.slice(offset, offset + 5);
          const started = [];

          for (const job of packet) {
            if (stopped || !canRunBot()) {
              break;
            }

            try {
              await calendarRequest(`/jobs/${job.id}/start`, {
                method: 'POST',
                body: { claimToken: job.claimToken },
              });
              started.push(job);
            } catch (error) {
              console.warn('[calendar groups] claim unavailable:', error.message);
            }
          }

          if (!started.length) {
            continue;
          }

          if (stopped || !canRunBot()) {
            continue;
          } // Started claims become uncertain; a second host must not resend blindly.
          try {
            const links = new ActionRowBuilder().addComponents(
              started
                .slice(0, 5)
                .map((job) =>
                  new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel(`ปฏิทิน ${job.payload.groupName}`.slice(0, 80))
                    .setURL(job.payload.url),
                ),
            );
            const nonce = createHash('sha256')
              .update(
                started
                  .map((j) => j.id)
                  .sort()
                  .join(':'),
              )
              .digest('hex')
              .slice(0, 25);
            const message = await channel.send({
              embeds: started.map((job) =>
                embed(job, Math.min(3600, Math.floor(5000 / started.length) - 256)),
              ),
              components: [links],
              allowedMentions: { parse: [] },
              nonce,
              enforceNonce: true,
            });

            for (const job of started) {
              await setSetting(`calendar_job:${job.id}`, message.id);
              await calendarRequest(`/jobs/${job.id}/ack`, {
                method: 'POST',
                body: { claimToken: job.claimToken, messageId: message.id },
              });
            }
          } catch (error) {
            for (const job of started) {
              await calendarRequest(`/jobs/${job.id}/ack`, {
                method: 'POST',
                body: {
                  claimToken: job.claimToken,
                  uncertain: true,
                  error: 'Delivery needs verification; do not retry blindly',
                },
              }).catch(() => {});
            }

            console.warn('[calendar groups] delivery requires verification:', error.message);
          }
        }
      }
    } catch (error) {
      console.warn('[calendar groups]', error.message);
    } finally {
      running = false;
    }
  }

  const timer = setInterval(() => void tick(), 15000);
  timer.unref();
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
    managedGuilds.clear();
  };
}
