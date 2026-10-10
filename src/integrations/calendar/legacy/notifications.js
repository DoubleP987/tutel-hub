import { t } from '../../../i18n/bot.js';
import { botLocale } from '../../../config/bot.js';
import { randomBytes } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  EmbedBuilder,
} from 'discord.js';
import { data } from '../../../database/connection.js';
import { setting } from '../../../database/settings.js';
import { reminderOptions, notificationText } from './options.js';
import { buildDailySummary } from './daily-summary.js';
import { requireBotLease } from '../../../cluster/state.js';

export function calendarUrl(eventKey, occurrenceAt) {
  const url = new URL(
    '/calendar',
    setting('public_calendar_url') ||
      process.env.PUBLIC_CALENDAR_URL ||
      'https://cskru.netlify.app',
  );
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(occurrenceAt));
  url.searchParams.set('date', date);
  if (eventKey !== null && eventKey !== undefined) {
    url.searchParams.set('event', String(eventKey));
    url.searchParams.set('at', occurrenceAt);
  }
  return url.toString();
}
export async function removeOldCalendarButtons(client, channelId) {
  const latest = await data.findOne('calendar_latest', { channel_id: channelId });
  if (!latest) return;
  const rows = (
    await data.findMany('calendar_deliveries', {
      channel_id: channelId,
      active: 1,
      message_id: { $ne: latest.message_id },
    })
  ).filter((row) => row.message_id);
  if (!rows.length) return;
  const channel = await client.channels.fetch(channelId);
  for (const row of rows) {
    try {
      const message = await channel.messages.fetch(row.message_id);
      await message.edit({ components: [] });
      await data.update('calendar_deliveries', { id: row.id }, { active: 0 });
    } catch (error) {
      if (error.code === 10008)
        await data.update('calendar_deliveries', { id: row.id }, { active: 0 });
      else console.error('[calendar] remove old button:', error.message);
    }
  }
}
export async function sendCalendarNotification(client, config, event, occurrence, schedule) {
  const values = [
    config.guild_id,
    config.channel_id,
    String(event.id),
    occurrence.at,
    schedule.key,
  ];
  if (
    await data.findOne('calendar_deliveries', {
      guild_id: values[0],
      channel_id: values[1],
      event_key: values[2],
      occurrence_at: values[3],
      schedule_key: values[4],
    })
  )
    return false;
  const channel = await client.channels.fetch(config.channel_id);
  if (!channel?.isSendable?.()) throw new Error(t('channel นี้ส่งข้อความไม่ได้'));
  const id = randomBytes(10).toString('hex');
  const when = new Intl.DateTimeFormat(botLocale, {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'full',
    ...(event.all_day ? {} : { timeStyle: 'short' }),
  }).format(new Date(occurrence.at));
  const options = reminderOptions(config.guild_id);
  const embed = new EmbedBuilder()
    .setColor(options.color)
    .setDescription(
      notificationText(event, when + (event.all_day ? t(' · ทั้งวัน') : ''), schedule, options),
    )
    .setFooter({ text: 'Tutel Calendar · by Double_P' });
  requireBotLease();
  const message = await channel.send({
    embeds: [embed],
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('calendar:show:' + id)
          .setLabel(t('ปฏิทิน'))
          .setStyle(ButtonStyle.Primary),
      ),
    ],
  });
  const payload = JSON.stringify({
    title: event.title,
    description: event.description,
    allDay: !!event.all_day,
  });
  await data.insert('calendar_deliveries', {
    id,
    guild_id: values[0],
    channel_id: values[1],
    event_key: values[2],
    occurrence_at: values[3],
    schedule_key: values[4],
    message_id: message.id,
    payload,
  });
  await data.upsert(
    'calendar_latest',
    { channel_id: config.channel_id },
    { message_id: message.id },
  );
  await removeOldCalendarButtons(client, config.channel_id).catch((error) =>
    console.error('[calendar] button cleanup:', error.message),
  );
  return true;
}

export async function sendDailyCalendarSummary(
  client,
  config,
  day,
  events,
  options,
  { test = false } = {},
) {
  const scheduleKey = test ? 'test:' + randomBytes(8).toString('hex') : 'daily-summary';
  const values = [
    config.guild_id,
    config.channel_id,
    'daily:' + day.key,
    day.startsAt,
    scheduleKey,
  ];
  const existing = await data.findOne('calendar_deliveries', {
    guild_id: values[0],
    channel_id: values[1],
    event_key: values[2],
    occurrence_at: values[3],
    schedule_key: values[4],
  });
  // Empty days do not create notifications; an existing day's message can reflect removals.
  if (!events.length && !existing && !test) return { skipped: true };
  const summary = buildDailySummary(day, events, options, { test });
  if (existing) {
    const payload = JSON.parse(existing.payload);
    if (payload.deleted) return { skipped: true };
    if (payload.hash === summary.hash) return { unchanged: true, messageId: existing.message_id };
  }
  const channel = await client.channels.fetch(config.channel_id);
  if (!channel?.isSendable?.()) throw new Error(t('channel นี้ส่งข้อความไม่ได้'));
  const id = existing?.id || randomBytes(10).toString('hex');
  const embed = new EmbedBuilder()
    .setColor(options.color)
    .setDescription(summary.description)
    .setFooter({ text: 'Tutel Calendar · by Double_P' });
  const body = {
    embeds: [embed],
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('calendar:show:' + id)
          .setLabel(t('ปฏิทิน'))
          .setStyle(ButtonStyle.Primary),
      ),
    ],
    files: summary.overflow
      ? [{ attachment: Buffer.from(summary.fullText, 'utf8'), name: `calendar-${day.key}.txt` }]
      : [],
  };
  if (existing) {
    const latest = await data.findOne('calendar_latest', { channel_id: config.channel_id });
    if (latest?.message_id !== existing.message_id) body.components = [];
    try {
      const message = await channel.messages.fetch(existing.message_id);
      // Replace old overflow attachments too; never send a second message for edits.
      requireBotLease();
      await message.edit({ ...body, attachments: [] });
    } catch (error) {
      if (error.code !== 10008) throw error;
      await data.update(
        'calendar_deliveries',
        { id },
        { active: 0, payload: JSON.stringify({ ...summary.payload, deleted: true }) },
      );
      return { skipped: true, deleted: true };
    }
    await data.update('calendar_deliveries', { id }, { payload: JSON.stringify(summary.payload) });
    return { updated: true, messageId: existing.message_id, count: events.length };
  }
  requireBotLease();
  const message = await channel.send(body);
  await data.insert('calendar_deliveries', {
    id,
    guild_id: values[0],
    channel_id: values[1],
    event_key: values[2],
    occurrence_at: values[3],
    schedule_key: values[4],
    message_id: message.id,
    payload: JSON.stringify(summary.payload),
  });
  await data.upsert(
    'calendar_latest',
    { channel_id: config.channel_id },
    { message_id: message.id },
  );
  await removeOldCalendarButtons(client, config.channel_id).catch((error) =>
    console.error('[calendar] daily button cleanup:', error.message),
  );
  return { sent: true, messageId: message.id, count: events.length };
}
export async function handleCalendarButton(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('calendar:')) return false;
  if (interaction.customId.startsWith('calendar:dismiss:')) {
    if (interaction.customId !== 'calendar:dismiss:' + interaction.user.id) {
      await interaction.reply({
        content: t('ปุ่มนี้เป็นของผู้เปิดรายละเอียด'),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferUpdate();
    await interaction.deleteReply().catch(() => {});
    return true;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const row = await data.findOne('calendar_deliveries', {
    id: interaction.customId.slice('calendar:show:'.length),
  });
  if (!row) {
    await interaction.editReply({ content: t('ไม่พบรายละเอียดแจ้งเตือนนี้'), components: [] });
    return true;
  }
  const event = JSON.parse(row.payload),
    url = calendarUrl(event.kind === 'daily-summary' ? null : row.event_key, row.occurrence_at);
  await interaction.editReply({
    content: (
      '📅 **' +
      event.title +
      t('**\nเปิดปฏิทินเพื่อดูรายละเอียด ข้อความนี้จะหายภายใน 30 วินาที')
    ).slice(0, 1900),
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel(t('เปิดปฏิทิน')).setStyle(ButtonStyle.Link).setURL(url),
        new ButtonBuilder()
          .setLabel('Dismiss')
          .setCustomId('calendar:dismiss:' + interaction.user.id)
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  });
  const timer = setTimeout(() => void interaction.deleteReply().catch(() => {}), 30000);
  timer.unref?.();
  return true;
}
