import { db } from './db.js';
import { dateParts, fromLocal } from './recurrence.js';
import { listGuildConfigs, listExpandedEvents } from './events.js';
import { reminderOptions, shouldNotify } from './options.js';
import { sendCalendarNotification, removeOldCalendarButtons } from './notifications.js';

export function reminderSchedules(event, occurrence, options = null) {
  if (event.all_day || event.reminder_mode === 'standard') {
    const p = dateParts(new Date(occurrence.at)),
      previous = new Date(Date.UTC(p.y, p.m - 1, p.d - 1));
    const prev = {
      y: previous.getUTCFullYear(),
      m: previous.getUTCMonth() + 1,
      d: previous.getUTCDate(),
      h: 12,
      min: 0,
    };
    const [bh, bm] = (options?.beforeTime || '12:00').split(':').map(Number),
      [dh, dm] = (options?.dayTime || '07:00').split(':').map(Number);
    return [
      { key: 'previous-noon', at: fromLocal({ ...prev, h: bh, min: bm }), label: 'พรุ่งนี้' },
      {
        key: 'day-of',
        at: event.all_day ? fromLocal({ ...p, h: dh, min: dm }) : occurrence.at,
        label: event.all_day ? 'วันนี้' : 'ถึงเวลาแล้ว',
      },
    ].filter((s) =>
      s.key === 'previous-noon' ? options?.beforeEnabled !== false : options?.dayEnabled !== false,
    );
  }
  return event.reminders.map((offset) => ({
    key: 'offset:' + offset,
    at: new Date(new Date(occurrence.at).getTime() - offset * 60000).toISOString(),
    label: offset === 0 ? 'ถึงเวลาแล้ว' : 'อีก ' + offset + ' นาที',
  }));
}
export async function runReminderTick(client, now = Date.now()) {
  if (!client?.isReady()) return;
  const configs = listGuildConfigs().filter((c) => c.channel_id);
  if (!configs.length) return;
  const events = listExpandedEvents(new Date(now - 8 * 86400000), new Date(now + 8 * 86400000));
  for (const config of configs) {
    const options = reminderOptions(config.guild_id);
    await removeOldCalendarButtons(client, config.channel_id).catch((error) =>
      console.error('[calendar] cleanup:', error.message),
    );
    for (const event of events) {
      if (event.guild_id && event.guild_id !== config.guild_id) continue;
      if (!shouldNotify(event, options)) continue;
      const occurrence = { at: event.occurrence_at, end: event.occurrence_end };
      for (const schedule of reminderSchedules(event, occurrence, options)) {
        const fireAt = new Date(schedule.at).getTime();
        // A one-hour recovery window handles restarts without replaying old reminders.
        if (fireAt > now || now - fireAt > 3600000) continue;
        if (
          schedule.key.startsWith('offset:') &&
          !event.systemHoliday &&
          db
            .prepare(
              'SELECT 1 FROM reminder_log WHERE event_id=? AND occurrence_at=? AND offset_minutes=?',
            )
            .get(event.id, occurrence.at, Number(schedule.key.slice(7)))
        )
          continue;
        try {
          await sendCalendarNotification(client, config, event, occurrence, schedule);
        } catch (error) {
          console.error('[calendar] send failed:', config.guild_id, error.message);
        }
      }
    }
  }
}
export function startReminderScheduler(getClient) {
  let busy = false,
    stopped = false;
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      await runReminderTick(getClient());
    } catch (error) {
      console.error('[calendar] scheduler:', error.message);
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 20000);
  timer.unref();
  void tick();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
