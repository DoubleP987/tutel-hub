import { t } from '../i18n/bot.js';
import {
  RADIO_STATIONS,
  getRadioDirectory,
  stationMatchesRegion,
  stationFrequency,
  radioCategory,
} from '../music/radio-directory.js';
import { probeRadio, radioHealthLabels } from '../music/radio-health.js';

export async function showRadioList(interaction) {
  await interaction.deferReply();
  const area = interaction.options.getString('area');
  const category = interaction.options.getString('category');
  const page = interaction.options.getInteger('page') || 1;
  let dynamic = [];
  try {
    dynamic = await getRadioDirectory();
  } catch (error) {
    console.warn('[radio] directory:', error.message);
  }
  const seen = new Set(RADIO_STATIONS.map((station) => station.url));
  const stations = [
    ...RADIO_STATIONS,
    ...dynamic
      .filter((station) => {
        const url = station.url_resolved || station.url;
        if (!url || seen.has(url)) return false;
        seen.add(url);
        return true;
      })
      .map((station) => ({
        ...station,
        frequency: stationFrequency(station),
        url: station.url_resolved || station.url,
      })),
  ].filter(
    (station) =>
      (!area ||
        station.region === area ||
        (area === 'south' && station.region === 'hatyai') ||
        stationMatchesRegion(station, area)) &&
      (!category || radioCategory(station) === category),
  );
  const pages = Math.max(1, Math.ceil(stations.length / 10));
  if (!stations.length || page > pages)
    return interaction.editReply(t('ไม่พบสถานีในหน้าหรือหมวดนี้'));
  const rows = stations.slice((page - 1) * 10, page * 10);
  const statuses = await Promise.all(rows.map(probeRadio));
  const lines = rows.map(
    (station, index) =>
      `${t(radioHealthLabels[statuses[index].status])} · **${station.name.replace(/[*`\n]/g, '').slice(0, 85)}**${station.frequency ? ` (${station.frequency} FM)` : ''}`,
  );
  return interaction.editReply({
    content:
      t('📻 สถานีวิทยุ · หน้า {0}/{1}\n', page, pages) +
      lines.join('\n') +
      t(
        '\nใช้ /radio play ใส่ชื่อสถานี · /radio list page เพื่อดูหน้าถัดไป\nสถานะตรวจจากเครื่องบอท ณ เวลาที่ตรวจ อาจเปลี่ยนได้',
      ),
    allowedMentions: { parse: [] },
  });
}
