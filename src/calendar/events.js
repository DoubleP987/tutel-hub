import { t } from '../i18n/bot.js';
import { createHash } from 'node:crypto';
import { data } from './db.js';
import { thaiImportantDays } from './holidays.js';
import { eventCategories } from './categories.js';
import {
  dateParts,
  addLocal,
  fromLocal,
  localDateTimeToIso,
  eventOccurrences,
} from './recurrence.js';

export async function listExpandedEvents(fromValue, toValue, guildId = null) {
  const from = new Date(fromValue),
    to = new Date(toValue);
  if (
    Number.isNaN(from.valueOf()) ||
    Number.isNaN(to.valueOf()) ||
    to <= from ||
    to - from > 1000 * 60 * 60 * 24 * 400
  )
    throw new Error(t('ช่วงวันที่ไม่ถูกต้อง'));
  const rows = await data.findMany(
    'events',
    guildId ? { $or: [{ guild_id: null }, { guild_id: guildId }] } : {},
    { sort: { starts_at: 1 } },
  );
  const expanded = rows.flatMap((event) =>
    eventOccurrences(event, from, to).map((occ) => ({
      ...event,
      occurrence_at: occ.at,
      occurrence_end: occ.end,
      reminders: JSON.parse(event.reminders),
    })),
  );
  for (let year = dateParts(from).y; year <= dateParts(to).y; year++) {
    for (const h of thaiImportantDays(year)) {
      const at = localDateTimeToIso(h.date + ' 00:00'),
        d = dateParts(new Date(at));
      if (new Date(at) < from || new Date(at) >= to) continue;
      const end = fromLocal(addLocal({ ...d, h: 0, min: 0 }, 'daily'));
      const key =
        'holiday:' + h.date + ':' + createHash('sha1').update(h.title).digest('hex').slice(0, 10);
      expanded.push({
        id: key,
        guild_id: null,
        title: h.title,
        description:
          h.type === 'public'
            ? t('วันหยุดราชการ')
            : h.type === 'bank'
              ? t('วันหยุดธนาคาร/วันสำคัญ')
              : t('วันสำคัญ (ไม่ใช่วันหยุดราชการ)'),
        starts_at: at,
        ends_at: end,
        all_day: 1,
        holiday: 1,
        holidayType: h.type,
        publicHoliday: h.type === 'public',
        recurrence: 'none',
        reminder_mode: 'standard',
        reminders: [],
        occurrence_at: at,
        occurrence_end: end,
        systemHoliday: true,
      });
    }
  }
  return expanded
    .map((e) => ({ ...e, color: e.color || '#4285f4', categories: eventCategories(e) }))
    .sort((a, b) => a.occurrence_at.localeCompare(b.occurrence_at));
}
export async function saveEvent(input, creatorId) {
  const title = String(input.title || '')
    .trim()
    .slice(0, 160);
  if (!title) throw new Error(t('ใส่ชื่อกิจกรรมก่อน'));
  const existing = input.id ? await data.findOne('events', { id: Number(input.id) }) : null;
  const color = input.color ?? existing?.color ?? '#4285f4';
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))
    throw new Error(t('สีกิจกรรมไม่ถูกต้อง'));
  const allDay = !!input.allDay,
    day = String(input.date || input.startsAt || '').slice(0, 10);
  const start = localDateTimeToIso(allDay ? day + ' 00:00' : input.startsAt);
  const end = allDay
    ? new Date(
        new Date(localDateTimeToIso((input.endDate || day) + ' 00:00')).getTime() + 86400000,
      ).toISOString()
    : input.endsAt
      ? localDateTimeToIso(input.endsAt)
      : new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
  if (new Date(end) <= new Date(start)) throw new Error(t('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม'));
  const recurrence = ['none', 'daily', 'weekly', 'monthly', 'yearly'].includes(input.recurrence)
    ? input.recurrence
    : 'none';
  const reminders = Array.isArray(input.reminders)
    ? input.reminders
        .map(Number)
        .filter((x) => Number.isInteger(x) && x >= 0 && x <= 10080)
        .slice(0, 5)
    : [15];
  const mode =
    allDay || input.reminderMode === 'standard' || !Array.isArray(input.reminders)
      ? 'standard'
      : 'offsets';
  const values = [
    input.guildId || null,
    title,
    String(input.description || '').slice(0, 2000),
    start,
    end,
    allDay ? 1 : 0,
    input.holiday ? 1 : 0,
    recurrence,
    JSON.stringify(reminders),
    mode,
    color,
    creatorId || null,
  ];
  const fields = [
    'guild_id',
    'title',
    'description',
    'starts_at',
    'ends_at',
    'all_day',
    'holiday',
    'recurrence',
    'reminders',
    'reminder_mode',
    'color',
    'created_by',
  ];
  const document = Object.fromEntries(fields.map((field, index) => [field, values[index]]));
  if (input.id) {
    delete document.created_by;
    const changes = await data.update('events', { id: Number(input.id) }, document);
    if (!changes) throw new Error(t('ไม่พบกิจกรรมนี้'));
    await data.remove('reminder_log', { event_id: Number(input.id) });
    return Number(input.id);
  }
  const result = await data.insert('events', document);
  return result.id;
}
export async function deleteEvent(id, guildId = null) {
  const changes = await data.remove('events', {
    id: Number(id),
    ...(guildId ? { guild_id: String(guildId) } : {}),
  });
  if (!changes) throw new Error(t('ไม่พบกิจกรรมนี้'));
}
export async function saveGuildConfig(guildId, guildName, channelId, defaultReminder = 15) {
  await data.upsert(
    'guild_config',
    { guild_id: String(guildId) },
    {
      guild_name: String(guildName || ''),
      channel_id: channelId ? String(channelId) : null,
      default_reminder: Math.min(10080, Math.max(0, Number(defaultReminder) || 0)),
      timezone: 'Asia/Bangkok',
    },
  );
}
export async function listGuildConfigs() {
  return data.findMany('guild_config');
}
