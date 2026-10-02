import { t } from '../i18n/bot.js';
import { botWebsite } from './bot.js';
export function botProfileDescription() {
  return t(
    'เพลง วิทยุสด และปฏิทินสำหรับเซิร์ฟเวอร์ Discord\nใช้ /play, /radio หรือ /calendar · /help เปิดเว็บและคู่มือ\n{0}\nby Double_P',
    botWebsite,
  );
}
