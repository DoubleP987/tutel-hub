import { listGuildConfigs, listExpandedEvents } from './events.js';
import { reminderOptions } from './options.js';
import { sendDailyCalendarSummary, removeOldCalendarButtons } from './notifications.js';
import { calendarDay, dailySummarySchedule, dailySummaryEvents } from './daily-summary.js';

export function reminderSchedules(event, occurrence, options = null) {
  // Compatibility helper: automatic notifications now use one day-level schedule.
  const schedule = dailySummarySchedule(calendarDay(occurrence.at), {
    enabled: true,
    dayEnabled: true,
    dayTime: '07:00',
    ...options,
  });
  return schedule ? [schedule] : [];
}
export async function runReminderTick(client, now = Date.now()) {
  if (!client?.isReady()) return;
  const configs = (await listGuildConfigs()).filter((c) => c.channel_id);
  if (!configs.length) return;
  const day = calendarDay(now);
  const events = await listExpandedEvents(day.startsAt, day.endsAt);
  for (const config of configs) {
    const options = reminderOptions(config.guild_id);
    await removeOldCalendarButtons(client, config.channel_id).catch((error) =>
      console.error('[calendar] cleanup:', error.message),
    );
    const schedule = dailySummarySchedule(day, options);
    if (!schedule || Date.parse(schedule.at) > now) continue;
    const agenda = dailySummaryEvents(events, day, config, options);
    try {
      // A late restart catches up today's summary, never a previous day's messages.
      // Later edits update the recorded message instead of sending another one.
      await sendDailyCalendarSummary(client, config, day, agenda, options);
    } catch (error) {
      console.error('[calendar] daily summary failed:', config.guild_id, error.message);
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
