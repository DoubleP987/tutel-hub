import { checkCalendarSetupPin } from '../calendar/setup-pin.js';
import {
  localDateTimeToIso,
  listExpandedEvents,
  saveEvent,
  deleteEvent,
  saveGuildConfig,
  listGuildConfigs,
  formatThai,
} from '../calendar/service.js';
import { guildOnly } from './shared.js';
import { calendarDay, dailySummaryEvents } from '../calendar/daily-summary.js';
import { sendDailyCalendarSummary } from '../calendar/notifications.js';
import { EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { reminderOptions, saveReminderOptions } from '../calendar/options.js';

export const calendarHandlers = {
  async calendar(interaction) {
    if (!guildOnly(interaction)) return;
    const sub = interaction.options.getSubcommand(),
      guildId = interaction.guildId;
    if (sub === 'setup') {
      const pinError = checkCalendarSetupPin(
        interaction.options.getString('pin'),
        'discord:' + interaction.user.id,
      );
      if (pinError) return interaction.reply({ content: pinError, ephemeral: true });
      const channel = interaction.options.getChannel('channel');
      const existing = listGuildConfigs().find((x) => x.guild_id === guildId);
      saveGuildConfig(
        guildId,
        interaction.guild.name,
        channel.id,
        existing?.default_reminder ?? 15,
      );
      return interaction.reply({
        content: 'ตั้ง channel แจ้งเตือนเป็น <#' + channel.id + '> แล้ว',
        ephemeral: true,
      });
    }
    if (sub === 'add') {
      try {
        const starts = interaction.options.getString('starts', true),
          duration = interaction.options.getInteger('duration') ?? 60;
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
        const cfg = listGuildConfigs().find((x) => x.guild_id === guildId);
        const reminder = interaction.options.getInteger('reminder') ?? cfg?.default_reminder ?? 15;
        const id = saveEvent(
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
          'เพิ่มกิจกรรม **' +
            interaction.options.getString('title', true) +
            '** (ID ' +
            id +
            ') แล้ว · ' +
            formatThai(start),
        );
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }
    if (sub === 'list') {
      const from = new Date(calendarDay().startsAt),
        to = new Date(Date.now() + 30 * 86400000);
      const all = listExpandedEvents(from, to, guildId);
      const items = all.slice(0, 10);
      if (!items.length) return interaction.reply('ไม่มีรายการใน 30 วันนี้');
      const date = new Intl.DateTimeFormat('th-TH', {
        timeZone: 'Asia/Bangkok',
        dateStyle: 'long',
      });
      const time = new Intl.DateTimeFormat('th-TH', {
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
        return `${heading}• ${event.all_day ? 'ทั้งวัน' : time.format(new Date(event.occurrence_at))} — ${title}${id}`;
      });
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x4285f4)
            .setTitle('📅 ปฏิทิน · 30 วันข้างหน้า')
            .setDescription(lines.join('\n').trim())
            .setFooter({
              text: `แสดง ${items.length} จาก ${all.length} รายการ · ID ใช้ลบกิจกรรมที่เพิ่มเอง`,
            }),
        ],
      });
    }
    if (sub === 'delete') {
      try {
        deleteEvent(interaction.options.getInteger('id', true), guildId);
        return interaction.reply('ลบรายการแล้ว');
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }
    if (sub === 'config') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
        return interaction.reply({
          content: 'ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนเวลาแจ้งเตือน',
          ephemeral: true,
        });
      const configs = listGuildConfigs(),
        cfg = configs.find((x) => x.guild_id === guildId);
      if (!cfg?.channel_id)
        return interaction.reply({
          content: 'ตั้ง channel ก่อนด้วย /calendar setup',
          ephemeral: true,
        });
      const time = interaction.options.getString('time', true);
      try {
        saveReminderOptions(guildId, {
          ...reminderOptions(guildId),
          dayEnabled: true,
          dayTime: time,
        });
        return interaction.reply(`ตั้งเวลาส่งสรุปกิจกรรมวันนี้เป็น ${time} น. เวลาไทยแล้ว`);
      } catch (error) {
        return interaction.reply({ content: error.message, ephemeral: true });
      }
    }
    if (sub === 'test') {
      const cfg = listGuildConfigs().find((x) => x.guild_id === guildId);
      if (!cfg?.channel_id)
        return interaction.reply({
          content: 'ตั้ง channel ก่อนด้วย /calendar setup',
          ephemeral: true,
        });
      await interaction.deferReply({ ephemeral: true });
      const day = calendarDay();
      const options = reminderOptions(guildId);
      const events = dailySummaryEvents(
        listExpandedEvents(day.startsAt, day.endsAt, guildId),
        day,
        cfg,
        options,
      );
      await sendDailyCalendarSummary(interaction.client, cfg, day, events, options, { test: true });
      return interaction.editReply(`ส่งตัวอย่างสรุปวันนี้ ${events.length} รายการแล้ว`);
    }
  },
};
