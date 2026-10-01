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
      const from = new Date(),
        to = new Date(Date.now() + 30 * 86400000);
      const items = listExpandedEvents(from, to, guildId).slice(0, 10);
      return interaction.reply(
        items.length
          ? items
              .map(
                (e) =>
                  '#' +
                  e.id +
                  ' · **' +
                  e.title +
                  '** — ' +
                  formatThai(e.occurrence_at) +
                  (e.holiday ? ' · วันสำคัญ' : ''),
              )
              .join('\n')
          : 'ไม่มีรายการใน 30 วันนี้',
      );
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
      const configs = listGuildConfigs(),
        cfg = configs.find((x) => x.guild_id === guildId);
      if (!cfg?.channel_id)
        return interaction.reply({
          content: 'ตั้ง channel ก่อนด้วย /calendar setup',
          ephemeral: true,
        });
      saveGuildConfig(
        guildId,
        interaction.guild.name,
        cfg.channel_id,
        interaction.options.getInteger('reminder', true),
      );
      return interaction.reply(
        'ตั้งค่าเตือนล่วงหน้าเป็น ' +
          interaction.options.getInteger('reminder', true) +
          ' นาทีแล้ว',
      );
    }
    if (sub === 'test') {
      const cfg = listGuildConfigs().find((x) => x.guild_id === guildId);
      if (!cfg?.channel_id)
        return interaction.reply({
          content: 'ตั้ง channel ก่อนด้วย /calendar setup',
          ephemeral: true,
        });
      const channel = await interaction.client.channels.fetch(cfg.channel_id);
      await channel.send({
        content: '✅ Tutel Calendar พร้อมส่งการแจ้งเตือนใน channel นี้',
        allowedMentions: { parse: [] },
      });
      return interaction.reply({ content: 'ส่งข้อความทดสอบแล้ว', ephemeral: true });
    }
  },
};
