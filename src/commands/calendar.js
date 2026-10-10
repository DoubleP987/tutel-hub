import { calendarConfigured, calendarRequest } from '../integrations/calendar/client.js';
import { botLocale } from '../config/bot.js';
import { t } from '../i18n/bot.js';
import { checkCalendarSetupPin } from '../integrations/calendar/legacy/setup-pin.js';
import {
  localDateTimeToIso,
  listExpandedEvents,
  saveEvent,
  deleteEvent,
  saveGuildConfig,
  listGuildConfigs,
  formatThai,
} from '../integrations/calendar/legacy/service.js';
import { guildOnly } from './shared.js';
import { calendarDay, dailySummaryEvents } from '../integrations/calendar/legacy/daily-summary.js';
import { sendDailyCalendarSummary } from '../integrations/calendar/legacy/notifications.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { reminderOptions, saveReminderOptions } from '../integrations/calendar/legacy/options.js';
import { guildCalendarEnabled } from '../bot/calendar-commands.js';

export const calendarHandlers = {
  async calendar(interaction) {
    if (!guildOnly(interaction)) {
      return;
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    if (calendarConfigured()) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (sub === 'connect') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
          return interaction.editReply({ content: 'เฉพาะผู้ที่มีสิทธิ์จัดการเซิร์ฟเวอร์ Discord' });
        }

        const permissions = interaction.channel?.permissionsFor?.(interaction.client.user);

        if (
          !permissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ])
        ) {
          return interaction.editReply({
            content: 'บอทต้องมีสิทธิ์ดูช่อง ส่งข้อความ และ Embed Links',
          });
        }

        const result = await calendarRequest('/connect-grants', {
          method: 'POST',
          body: { discordUserId: interaction.user.id, guildId, channelId: interaction.channelId },
        });
        return interaction.editReply({
          content: 'เปิดลิงก์นี้และเลือกกลุ่มที่คุณจัดการ · ลิงก์ใช้ได้ 10 นาที',
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('เชื่อมกลุ่มปฏิทิน')
                .setURL(result.url),
            ),
          ],
        });
      }

      const bindings = (await calendarRequest('/bindings')).filter(
        (b) => b.guild_id === guildId && b.channel_id === interaction.channelId,
      );

      if (!bindings.length) {
        return interaction.editReply({
          content: 'ช่องนี้ยังไม่เชื่อมกลุ่ม ให้ผู้ดูแลใช้ /calendar connect',
        });
      }

      return interaction.editReply({
        content: 'ดูและจัดการปฏิทินของกลุ่มผ่านเว็บ',
        components: [
          new ActionRowBuilder().addComponents(
            bindings.slice(0, 5).map((b) =>
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('ปฏิทิน ' + b.slug)
                .setURL(
                  new URL(
                    '/g/' + b.slug,
                    process.env.CALENDAR_WEB_URL || process.env.CALENDAR_SERVICE_URL,
                  ).href,
                ),
            ),
          ),
        ],
      });
    }

    if (!guildCalendarEnabled(guildId)) {
      return interaction.reply({
        content: t('เซิร์ฟเวอร์นี้ยังไม่เปิดใช้ปฏิทิน ให้ผู้ดูแลเปิดใน control panel ก่อน'),
        ephemeral: true,
      });
    }

    if (sub === 'setup') {
      const pinError = checkCalendarSetupPin(
        interaction.options.getString('pin'),
        'discord:' + interaction.user.id,
      );

      if (pinError) {
        return interaction.reply({ content: pinError, ephemeral: true });
      }

      const channel = interaction.options.getChannel('channel');
      const existing = (await listGuildConfigs()).find((x) => x.guild_id === guildId);
      await saveGuildConfig(
        guildId,
        interaction.guild.name,
        channel.id,
        existing?.default_reminder ?? 15,
      );
      return interaction.reply({
        content: t('ตั้ง channel แจ้งเตือนเป็น <#') + channel.id + t('> แล้ว'),
        ephemeral: true,
      });
    }

    if (sub === 'add') {
      try {
        const starts = interaction.options.getString('starts', true);
        const duration = interaction.options.getInteger('duration') ?? 60;
        const start = localDateTimeToIso(starts);
        const end = new Date(new Date(start).getTime() + duration * 60000);
        const endLocal = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Bangkok',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        })
          .format(end)
          .replace(', ', ' ');
        const repeat = interaction.options.getString('repeat') || 'none';
        const cfg = (await listGuildConfigs()).find((x) => x.guild_id === guildId);
        const reminder = interaction.options.getInteger('reminder') ?? cfg?.default_reminder ?? 15;
        const id = await saveEvent(
          {
            guildId,
            title: interaction.options.getString('title', true),
            description: interaction.options.getString('description') || '',
            startsAt: starts,
            endsAt: endLocal,
            recurrence: repeat,
            reminders: [reminder],
          },
          null,
        );
        return interaction.reply(
          t('เพิ่มกิจกรรม **') +
            interaction.options.getString('title', true) +
            '** (ID ' +
            id +
            t(') แล้ว · ') +
            formatThai(start),
        );
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }

    if (sub === 'list') {
      const from = new Date(calendarDay().startsAt);
      const to = new Date(Date.now() + 30 * 86400000);
      const all = await listExpandedEvents(from, to, guildId);
      const items = all.slice(0, 10);

      if (!items.length) {
        return interaction.reply(t('ไม่มีรายการใน 30 วันนี้'));
      }

      const date = new Intl.DateTimeFormat(botLocale, {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'long',
      });
      const time = new Intl.DateTimeFormat(botLocale, {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      });
      let previousDay = '';
      const lines = items.map((event) => {
        const day = date.format(new Date(event.occurrence_at));
        const heading = day === previousDay ? '' : `\n**${day}**\n`;
        previousDay = day;
        const title = event.title
          .replace(/\s+/g, ' ')
          .replace(/([\\`*_<>|])/g, '\\$1')
          .slice(0, 180);
        const id = typeof event.id === 'number' ? ` · ID ${event.id}` : '';
        return `${heading}• ${event.all_day ? t('ทั้งวัน') : time.format(new Date(event.occurrence_at))} — ${title}${id}`;
      });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x4285f4)
            .setTitle(t('📅 ปฏิทิน · 30 วันข้างหน้า'))
            .setDescription(lines.join('\n').trim())
            .setFooter({
              text: t(
                'แสดง {0} จาก {1} รายการ · ID ใช้ลบกิจกรรมที่เพิ่มเอง',
                items.length,
                all.length,
              ),
            }),
        ],
      });
    }

    if (sub === 'delete') {
      try {
        await deleteEvent(interaction.options.getInteger('id', true), guildId);
        return interaction.reply(t('ลบรายการแล้ว'));
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }

    if (sub === 'config') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        return interaction.reply({
          content: t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนเวลาแจ้งเตือน'),
          ephemeral: true,
        });
      }

      const configs = await listGuildConfigs();
      const cfg = configs.find((x) => x.guild_id === guildId);

      if (!cfg?.channel_id) {
        return interaction.reply({
          content: t('ตั้ง channel ก่อนด้วย /calendar setup'),
          ephemeral: true,
        });
      }

      const time = interaction.options.getString('time', true);

      try {
        await saveReminderOptions(guildId, {
          ...reminderOptions(guildId),
          dayEnabled: true,
          dayTime: time,
        });
        return interaction.reply(t('ตั้งเวลาส่งสรุปกิจกรรมวันนี้เป็น {0} น. เวลาไทยแล้ว', time));
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }

    if (sub === 'test') {
      const cfg = (await listGuildConfigs()).find((x) => x.guild_id === guildId);

      if (!cfg?.channel_id) {
        return interaction.reply({
          content: t('ตั้ง channel ก่อนด้วย /calendar setup'),
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });
      const day = calendarDay();
      const options = reminderOptions(guildId);
      const events = dailySummaryEvents(
        await listExpandedEvents(day.startsAt, day.endsAt, guildId),
        day,
        cfg,
        options,
      );
      await sendDailyCalendarSummary(interaction.client, cfg, day, events, options, { test: true });
      return interaction.editReply(t('ส่งตัวอย่างสรุปวันนี้ {0} รายการแล้ว', events.length));
    }
  },
};
