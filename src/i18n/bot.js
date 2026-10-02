import english from './en.json' with { type: 'json' };
import { botLanguage } from '../config/bot.js';
export function t(thai, ...values) {
  const template = botLanguage === 'en' ? (english[thai] ?? thai) : thai;
  return template.replace(/\{(\d+)\}/g, (placeholder, index) =>
    Number(index) < values.length ? String(values[Number(index)]) : placeholder,
  );
}
