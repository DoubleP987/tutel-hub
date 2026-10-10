import { botLocale } from '../../../config/bot.js';
import { t } from '../../../i18n/bot.js';
import { createHash } from 'node:crypto';
import { dateParts, fromLocal, addLocal } from './recurrence.js';
import { categories, eventCategories } from './categories.js';
import { shouldNotify } from './options.js';

const thaiTime = new Intl.DateTimeFormat(botLocale, {
  timeZone: 'Asia/Bangkok',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function calendarDay(value = new Date()) {
  const local = { ...dateParts(new Date(value)), h: 0, min: 0 };
  return {
    key: `${local.y}-${String(local.m).padStart(2, '0')}-${String(local.d).padStart(2, '0')}`,
    startsAt: fromLocal(local),
    endsAt: fromLocal(addLocal(local, 'daily')),
    local,
  };
}

export function dailySummarySchedule(day, options) {
  if (!options.enabled || !options.dayEnabled) {
    return null;
  }

  const [h, min] = options.dayTime.split(':').map(Number);
  return { key: 'daily-summary', at: fromLocal({ ...day.local, h, min }), label: t('วันนี้') };
}

export function dailySummaryEvents(events, day, config, options) {
  const start = Date.parse(day.startsAt);
  const end = Date.parse(day.endsAt);
  const unique = new Map();

  for (const event of events) {
    if (event.guild_id && event.guild_id !== config.guild_id) {
      continue;
    }

    if (!shouldNotify(event, options)) {
      continue;
    }

    if (Date.parse(event.occurrence_at) >= end || Date.parse(event.occurrence_end) <= start) {
      continue;
    }

    unique.set(`${event.id}|${event.occurrence_at}`, event);
  }

  return [...unique.values()].sort(
    (a, b) =>
      Number(!!b.all_day) - Number(!!a.all_day) ||
      a.occurrence_at.localeCompare(b.occurrence_at) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

function eventTime(event, day) {
  if (event.all_day) {
    return t('ทั้งวัน');
  }

  const start = Date.parse(event.occurrence_at);
  const end = Date.parse(event.occurrence_end);
  const startLabel =
    start < Date.parse(day.startsAt) ? t('ต่อเนื่องจากวันก่อน') : thaiTime.format(new Date(start));
  const endLabel = end >= Date.parse(day.endsAt) ? '24:00' : thaiTime.format(new Date(end));
  return `${startLabel}–${endLabel}`;
}

function singleLine(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeMarkdown(value) {
  return value.replace(/([\\`*_{}\[\]()<>|~])/g, '\\$1');
}

export function buildDailySummary(day, events, options, { test = false } = {}) {
  const when = new Intl.DateTimeFormat(botLocale, {
    timeZone: 'Asia/Bangkok',
    dateStyle: 'full',
  }).format(new Date(day.startsAt));
  const title = t('{0}ปฏิทินวันนี้ · {1} รายการ', test ? t('ทดสอบ · ') : '', events.length);
  const categoryIds = new Set(events.flatMap(eventCategories));
  const replacements = {
    title,
    date: when,
    schedule: t('วันนี้'),
    description: '',
    category: categories
      .filter((category) => categoryIds.has(category.id))
      .map((category) => category.label)
      .join(' · '),
  };
  // The template customizes the heading. The agenda is always included below it.
  const heading = options.template
    .replace(/\{(title|date|schedule|description|category)\}/g, (_, key) => replacements[key])
    .trim()
    .slice(0, 1600);
  const entries = events.map((event) => {
    const label = `${eventTime(event, day)} · ${singleLine(event.title)}`;
    const detail = options.showDetails ? singleLine(event.description) : '';
    return {
      markdown: `• **${escapeMarkdown(label)}**${detail ? '\n  ' + escapeMarkdown(detail) : ''}`,
      plain: `• ${label}${detail ? '\n  ' + detail : ''}`,
    };
  });
  const emptyText = t('วันนี้ไม่มีรายการในหมวดที่เลือก');
  const fullText = `${title}\n${when}\n\n${entries.map((entry) => entry.plain).join('\n\n') || emptyText}`;
  const description = `${heading}\n\n${entries.map((entry) => entry.markdown).join('\n\n') || emptyText}`;
  const overflow = description.length > 3900;
  let visible = heading;

  if (overflow) {
    for (const entry of entries) {
      if (visible.length + entry.markdown.length + 180 > 3900) {
        break;
      }

      visible += '\n\n' + entry.markdown;
    }

    visible += t('\n\nรายการครบทั้งหมดอยู่ในไฟล์แนบและปุ่มปฏิทินด้านล่าง');
  }

  const hash = createHash('sha256')
    .update(JSON.stringify({ date: day.key, title, description, color: options.color }))
    .digest('hex');
  return {
    title,
    description: overflow ? visible : description,
    fullText,
    overflow,
    hash,
    payload: { kind: 'daily-summary', date: day.key, title, count: events.length, hash },
  };
}
