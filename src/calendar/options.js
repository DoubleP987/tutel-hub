import { setting, setSetting } from './db.js';
import { categories, eventCategories } from './categories.js';
export const defaults = {
  enabled: true,
  categories: categories.map((c) => c.id).filter((c) => c !== 'holy'),
  notifyNonHolidays: true,
  color: '#4285f4',
  template: '📅 {title}\n{schedule} · {date}\n{description}',
  beforeEnabled: true,
  beforeTime: '12:00',
  dayEnabled: true,
  dayTime: '07:00',
  showDetails: true,
};
export function normalizeOptions(input = {}) {
  const result = { ...defaults };
  for (const key of ['enabled', 'notifyNonHolidays', 'beforeEnabled', 'dayEnabled', 'showDetails'])
    if (typeof input[key] === 'boolean') result[key] = input[key];
  if (input.categories !== undefined) {
    if (
      !Array.isArray(input.categories) ||
      input.categories.some((c) => !categories.some((x) => x.id === c))
    )
      throw new Error('หมวดแจ้งเตือนไม่ถูกต้อง');
    result.categories = [...new Set(input.categories)];
  }
  for (const key of ['beforeTime', 'dayTime'])
    if (input[key] !== undefined) {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input[key])) throw new Error('เวลาแจ้งเตือนไม่ถูกต้อง');
      result[key] = input[key];
    }
  if (input.color !== undefined) {
    if (!/^#[\da-f]{6}$/i.test(input.color)) throw new Error('สีแจ้งเตือนไม่ถูกต้อง');
    result.color = input.color;
  }
  if (input.template !== undefined) {
    if (
      typeof input.template !== 'string' ||
      !input.template.trim() ||
      input.template.length > 1200
    )
      throw new Error('ข้อความต้องมี 1–1200 ตัวอักษร');
    result.template = input.template;
  }
  return result;
}
export function reminderOptions(guild) {
  try {
    return normalizeOptions(JSON.parse(setting('reminder_options:' + guild) || '{}'));
  } catch {
    return { ...defaults };
  }
}
export function saveReminderOptions(guild, input) {
  const options = normalizeOptions(input);
  setSetting('reminder_options:' + guild, JSON.stringify(options));
  return options;
}
export function shouldNotify(event, options) {
  return (
    options.enabled &&
    (!event.systemHoliday || event.publicHoliday || options.notifyNonHolidays) &&
    eventCategories(event).some((c) => options.categories.includes(c))
  );
}
export function notificationText(event, when, schedule, options) {
  const data = {
    title: event.title,
    date: when,
    schedule: schedule.label,
    description: options.showDetails ? event.description || '' : '',
    category: eventCategories(event)
      .map((id) => categories.find((c) => c.id === id)?.label)
      .join(' · '),
  };
  return options.template
    .replace(/\{(title|date|schedule|description|category)\}/g, (_, key) => data[key])
    .trim()
    .slice(0, 3900);
}
