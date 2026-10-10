import { t } from '../../../i18n/bot.js';
import { botLocale } from '../../../config/bot.js';

const TZ = 'Asia/Bangkok';

export const dateParts = (date) => {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute };
};

export function localDateTimeToIso(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);

  if (!match) {
    throw new Error(t('กรุณาใช้วันเวลาแบบ YYYY-MM-DD HH:mm (เวลาไทย)'));
  }

  const [, ys, ms, ds, hs, mins] = match;
  const check = new Date(Date.UTC(+ys, +ms - 1, +ds));

  if (
    check.getUTCFullYear() !== +ys ||
    check.getUTCMonth() !== +ms - 1 ||
    check.getUTCDate() !== +ds ||
    +hs > 23 ||
    +mins > 59
  ) {
    throw new Error(t('วันเวลาไม่ถูกต้อง'));
  }

  const date = new Date(Date.UTC(+ys, +ms - 1, +ds, +hs - 7, +mins));

  if (Number.isNaN(date.valueOf())) {
    throw new Error(t('วันเวลาไม่ถูกต้อง'));
  }

  return date.toISOString();
}

export function addLocal(p, recurrence, anchorDay = p.d) {
  let d = new Date(Date.UTC(p.y, p.m - 1, p.d));

  if (recurrence === 'daily') {
    d.setUTCDate(d.getUTCDate() + 1);
  } else if (recurrence === 'weekly') {
    d.setUTCDate(d.getUTCDate() + 7);
  } else if (recurrence === 'monthly') {
    const day = anchorDay;
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  } else if (recurrence === 'yearly') {
    const month = p.m;
    const day = anchorDay;
    d.setUTCFullYear(d.getUTCFullYear() + 1);
    d.setUTCMonth(month - 1, 1);
    const last = new Date(Date.UTC(d.getUTCFullYear(), month, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, last));
  }

  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: p.h, min: p.min };
}

export function fromLocal(p) {
  return new Date(Date.UTC(p.y, p.m - 1, p.d, p.h - 7, p.min)).toISOString();
}

export function eventOccurrences(event, from, to) {
  const starts = new Date(event.starts_at);
  const ends = new Date(event.ends_at);
  const duration = ends - starts;
  const result = [];
  let p = dateParts(starts);
  let cursor = starts;
  let guard = 0;

  if (event.recurrence && event.recurrence !== 'none' && cursor < from) {
    const target = dateParts(new Date(from.valueOf() - duration));

    if (event.recurrence === 'daily' || event.recurrence === 'weekly') {
      const a = Date.UTC(p.y, p.m - 1, p.d);
      const b = Date.UTC(target.y, target.m - 1, target.d);
      const gap = Math.floor((b - a) / 86400000);
      const unit = event.recurrence === 'weekly' ? 7 : 1;
      const steps = Math.max(0, Math.floor(gap / unit));
      const shifted = new Date(Date.UTC(p.y, p.m - 1, p.d + steps * unit));
      p = {
        ...p,
        y: shifted.getUTCFullYear(),
        m: shifted.getUTCMonth() + 1,
        d: shifted.getUTCDate(),
      };
    } else if (event.recurrence === 'monthly') {
      const gap = (target.y - p.y) * 12 + target.m - p.m;

      if (gap > 0) {
        const day = p.d;
        const monthIndex = p.y * 12 + p.m - 1 + gap;
        const y = Math.floor(monthIndex / 12);
        const m = (monthIndex % 12) + 1;
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        p = { ...p, y, m, d: Math.min(day, last) };
      }
    } else if (event.recurrence === 'yearly' && target.y > p.y) {
      const gap = target.y - p.y;
      const month = p.m;
      const day = p.d;
      const last = new Date(Date.UTC(p.y + gap, month, 0)).getUTCDate();
      p = { ...p, y: p.y + gap, m: month, d: Math.min(day, last) };
    }

    cursor = new Date(fromLocal(p));
  }

  while (cursor < to && guard++ < 800) {
    if (cursor.getTime() + duration > from.valueOf()) {
      result.push({
        at: cursor.toISOString(),
        end: new Date(cursor.getTime() + duration).toISOString(),
      });
    }

    if (!event.recurrence || event.recurrence === 'none') {
      break;
    }

    p = addLocal(p, event.recurrence, dateParts(starts).d);
    cursor = new Date(fromLocal(p));
  }

  return result;
}

export function formatThai(iso) {
  return new Intl.DateTimeFormat(botLocale, {
    timeZone: TZ,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}
