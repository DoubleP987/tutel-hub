import { t } from '../../../i18n/bot.js';
export const categories = [
  { id: 'public', label: t('วันหยุดราชการ') },
  { id: 'substitute', label: t('วันหยุดชดเชย') },
  { id: 'bank', label: t('วันหยุดธนาคาร') },
  { id: 'buddhist', label: t('วันสำคัญทางพุทธศาสนา') },
  { id: 'holy', label: t('วันพระ') },
  { id: 'royal', label: t('วันสำคัญสถาบันพระมหากษัตริย์') },
  { id: 'festival', label: t('เทศกาลและประเพณี') },
  { id: 'thai', label: t('วันสำคัญไทย') },
  { id: 'international', label: t('วันสำคัญสากล') },
  { id: 'custom', label: t('กิจกรรมที่เพิ่มเอง') },
];
export function eventCategories(e) {
  if (Array.isArray(e.categories)) return e.categories;
  if (!e.systemHoliday) return ['custom'];
  const title = e.title || '',
    list = [];
  if (e.publicHoliday) list.push('public');
  if (title.startsWith('ชดเชย')) list.push('substitute');
  if (e.holidayType === 'bank') list.push('bank');
  if (/^วันพระ(?:\s|$)/.test(title)) list.push('holy');
  if (/มาฆบูชา|วิสาขบูชา|อาสาฬหบูชา|เข้าพรรษา|ออกพรรษา|เทโว|อัฏฐมีบูชา/.test(title))
    list.push('buddhist');
  if (/ราช|รัชกาล|พระบรม|พระบาท|พระนาง|วันพ่อ|วันแม่|วันจักรี|วันชาติ/.test(title))
    list.push('royal');
  if (/สงกรานต์|ลอยกระทง|สารท|ตรุษจีน|คริสต์มาส|ฮาโลวีน|วาเลนไทน์/.test(title))
    list.push('festival');
  if (/สากล|โลก|สหประชาชาติ/.test(title)) list.push('international');
  if (!list.length) list.push('thai');
  return list;
}
