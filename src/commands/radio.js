import { playRadio } from '../music/player.js';
import { guildOnly } from './shared.js';
import {
  RADIO_STATIONS,
  RADIO_REGIONS,
  norm,
  getRadioDirectory,
  stationMatchesRegion,
  stationFrequency,
} from '../music/radio-directory.js';

export const radioHandlers = {
  async radio(interaction) {
    if (!guildOnly(interaction)) return;
    const sub = interaction.options.getSubcommand();
    const region = interaction.options.getString('area');
    if (sub === 'list') {
      await interaction.deferReply();
      try {
        const dynamicRows = await getRadioDirectory();
        const staticRows = RADIO_STATIONS.filter(
          (station) =>
            !region ||
            station.region === region ||
            (region === 'south' && station.region === 'hatyai'),
        );
        const liveRows = dynamicRows
          .filter(
            (station) =>
              station.lastcheckok === 1 &&
              (station.url_resolved || station.url) &&
              stationMatchesRegion(station, region),
          )
          .sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0))
          .map((station) => ({
            name: station.name,
            frequency: stationFrequency(station),
            aliases: [],
            region: region || station.state || 'Thailand',
            url: station.url_resolved || station.url,
            state: station.state || '',
          }));
        const seen = new Set(staticRows.map((station) => station.url));
        const rows = [...staticRows, ...liveRows.filter((station) => !seen.has(station.url))].slice(
          0,
          12,
        );
        if (!rows.length)
          return interaction.editReply(
            'API ยังไม่พบสตรีมที่ตรวจว่าออนไลน์ในภาคนี้ ลองเลือกภาคอื่นหรือค้นด้วยชื่อสถานี',
          );
        return interaction.editReply(
          'สถานีออนไลน์ที่ค้นได้จากไดเรกทอรี\n' +
            rows
              .map(
                (station) =>
                  '• ' +
                  station.name +
                  (station.frequency ? ' (' + station.frequency + ' MHz)' : '') +
                  (station.state ? ' · ' + station.state : ''),
              )
              .join('\n') +
            '\nเปิดด้วย /radio play แล้วใส่ชื่อสถานี',
        );
      } catch (error) {
        console.error('[radio] directory lookup failed:', error);
        return interaction.editReply('ค้นไดเรกทอรีวิทยุไม่สำเร็จชั่วคราว ลองใหม่อีกครั้ง');
      }
    }

    const query = norm(interaction.options.getString('station', true));
    const station = RADIO_STATIONS.find(
      (item) =>
        (!region || item.region === region || (region === 'south' && item.region === 'hatyai')) &&
        (item.aliases.some((alias) => norm(alias) === query) ||
          norm(item.name) === query ||
          item.frequency === query),
    );
    let selected = station;
    if (!selected) {
      await interaction.deferReply();
      try {
        const rows = await getRadioDirectory();
        const numeric = /^\d{2,3}(?:\.\d{1,2})?$/.test(query);
        const found = rows
          .filter((row) => {
            if (
              row.lastcheckok !== 1 ||
              !(row.url_resolved || row.url) ||
              !stationMatchesRegion(row, region)
            )
              return false;
            const name = norm(row.name || '');
            const tags = norm(row.tags || '');
            if (numeric)
              return (
                stationFrequency(row) === query || name.includes(query) || tags.includes(query)
              );
            return name.includes(query) || tags.includes(query);
          })
          .sort((a, b) => {
            const exactA = norm(a.name) === query ? 1 : 0,
              exactB = norm(b.name) === query ? 1 : 0;
            return exactB - exactA || (b.clickcount || 0) - (a.clickcount || 0);
          });
        if (!found.length)
          return interaction.editReply(
            'ไดเรกทอรียังไม่มีสตรีมออนไลน์ที่ตรงกับความถี่/ชื่อและภาคนี้ ลอง /radio list เลือกสถานีจากรายการ',
          );
        if (
          found.length > 1 &&
          norm(found[0].name) !== query &&
          (found[1].clickcount || 0) >= (found[0].clickcount || 0) * 0.8
        ) {
          return interaction.editReply(
            'พบหลายสถานีใกล้เคียง: ' +
              found
                .slice(0, 5)
                .map((row) => row.name + (row.state ? ' (' + row.state + ')' : ''))
                .join(' · ') +
              '\nคัดลอกชื่อสถานีที่ต้องการมาใส่ใน /radio play',
          );
        }
        const row = found[0];
        selected = {
          name: row.name,
          frequency: stationFrequency(row) || query,
          region: region || row.state || 'Thailand',
          url: row.url_resolved || row.url,
        };
      } catch (error) {
        console.error('[radio] directory lookup failed:', error);
        return interaction.editReply('ค้นสตรีมวิทยุไม่สำเร็จชั่วคราว ลองใหม่อีกครั้ง');
      }
    }
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel) {
      if (interaction.deferred) return interaction.editReply('เข้าห้อง voice ก่อนนะ');
      return interaction.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    }
    if (!interaction.deferred) await interaction.deferReply();
    playRadio(interaction.guildId, channel, selected);
    return interaction.editReply(
      'กำลังเปิดวิทยุสด ' +
        selected.name +
        (selected.frequency ? ' (' + selected.frequency + ' MHz)' : ''),
    );
  },
};
