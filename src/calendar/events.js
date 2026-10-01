import { createHash } from 'node:crypto';
import { db } from './db.js';
import { thaiImportantDays } from './holidays.js';
import { eventCategories } from './categories.js';
import {
  dateParts,
  addLocal,
  fromLocal,
  localDateTimeToIso,
  eventOccurrences,
} from './recurrence.js';

export function listExpandedEvents(fromValue, toValue, guildId = null) {
  const from = new Date(fromValue),
    to = new Date(toValue);
  if (
    Number.isNaN(from.valueOf()) ||
    Number.isNaN(to.valueOf()) ||
    to <= from ||
    to - from > 1000 * 60 * 60 * 24 * 400
  )
    throw new Error('ช่วงวันที่ไม่ถูกต้อง');
  const rows = guildId
    ? db
        .prepare('SELECT * FROM events WHERE guild_id IS NULL OR guild_id=? ORDER BY starts_at')
        .all(guildId)
    : db.prepare('SELECT * FROM events ORDER BY starts_at').all();
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
            ? 'วันหยุดราชการ'
            : h.type === 'bank'
              ? 'วันหยุดธนาคาร/วันสำคัญ'
              : 'วันสำคัญ (ไม่ใช่วันหยุดราชการ)',
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
export function saveEvent(input, creatorId) {
  const title = String(input.title || '')
    .trim()
    .slice(0, 160);
  if (!title) throw new Error('ใส่ชื่อกิจกรรมก่อน');
  const existing = input.id
    ? db.prepare('SELECT color FROM events WHERE id=?').get(input.id)
    : null;
  const color = input.color ?? existing?.color ?? '#4285f4';
  if (typeof color !== 'string' || !/^#[\da-f]{6}$/i.test(color))
    throw new Error('สีกิจกรรมไม่ถูกต้อง');
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
  if (new Date(end) <= new Date(start)) throw new Error('เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม');
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
  if (input.id) {
    const result = db
      .prepare(
        'UPDATE events SET guild_id=?,title=?,description=?,starts_at=?,ends_at=?,all_day=?,holiday=?,recurrence=?,reminders=?,reminder_mode=?,color=? WHERE id=?',
      )
      .run(...values.slice(0, 11), input.id);
    if (!result.changes) throw new Error('ไม่พบกิจกรรมนี้');
    db.prepare('DELETE FROM reminder_log WHERE event_id=?').run(input.id);
    return Number(input.id);
  }
  const result = db
    .prepare(
      'INSERT INTO events(guild_id,title,description,starts_at,ends_at,all_day,holiday,recurrence,reminders,reminder_mode,color,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
    )
    .run(...values);
  return Number(result.lastInsertRowid);
}
export function deleteEvent(id, guildId = null) {
  const result = guildId
    ? db.prepare('DELETE FROM events WHERE id=? AND guild_id=?').run(Number(id), String(guildId))
    : db.prepare('DELETE FROM events WHERE id=?').run(Number(id));
  if (!result.changes) throw new Error('ไม่พบกิจกรรมนี้');
}
export function saveGuildConfig(guildId, guildName, channelId, defaultReminder = 15) {
  db.prepare(
    'INSERT INTO guild_config(guild_id,guild_name,channel_id,default_reminder) VALUES(?,?,?,?) ON CONFLICT(guild_id) DO UPDATE SET guild_name=excluded.guild_name,channel_id=excluded.channel_id,default_reminder=excluded.default_reminder',
  ).run(
    String(guildId),
    String(guildName || ''),
    channelId ? String(channelId) : null,
    Math.min(10080, Math.max(0, Number(defaultReminder) || 0)),
  );
}
export function listGuildConfigs() {
  return db.prepare('SELECT * FROM guild_config').all();
}
