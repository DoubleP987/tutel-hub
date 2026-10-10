import { musicRequestVersion } from '../music/events.js';
import { setSetting } from '../database/settings.js';
import { showRadioList } from './radio-list.js';
import { probeRadio, radioHealthLabels } from '../music/radio-health.js';
import { t } from '../i18n/bot.js';
import { playRadio } from '../music/player.js';
import { guildOnly } from './shared.js';
import { showMusicPanel, recordMusicAction } from '../music/panel.js';
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
    if (!guildOnly(interaction)) {
      return;
    }

    const sub = interaction.options.getSubcommand();
    const region = interaction.options.getString('area');

    if (sub === 'list') {
      return showRadioList(interaction);
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
            if (!(row.url_resolved || row.url) || !stationMatchesRegion(row, region)) {
              return false;
            }

            const name = norm(row.name || '');
            const tags = norm(row.tags || '');

            if (numeric) {
              return (
                stationFrequency(row) === query || name.includes(query) || tags.includes(query)
              );
            }

            return name.includes(query) || tags.includes(query);
          })
          .sort((a, b) => {
            const exactA = norm(a.name) === query ? 1 : 0;
            const exactB = norm(b.name) === query ? 1 : 0;
            return exactB - exactA || (b.clickcount || 0) - (a.clickcount || 0);
          });

        if (!found.length) {
          return interaction.editReply(
            t(
              'ไดเรกทอรียังไม่มีสตรีมออนไลน์ที่ตรงกับความถี่/ชื่อและภาคนี้ ลอง /radio list เลือกสถานีจากรายการ',
            ),
          );
        }

        if (
          found.length > 1 &&
          norm(found[0].name) !== query &&
          (found[1].clickcount || 0) >= (found[0].clickcount || 0) * 0.8
        ) {
          return interaction.editReply(
            t('พบหลายสถานีใกล้เคียง: ') +
              found
                .slice(0, 5)
                .map((row) => row.name + (row.state ? ' (' + row.state + ')' : ''))
                .join(' · ') +
              t('\nคัดลอกชื่อสถานีที่ต้องการมาใส่ใน /radio play'),
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
        return interaction.editReply(t('ค้นสตรีมวิทยุไม่สำเร็จชั่วคราว ลองใหม่อีกครั้ง'));
      }
    }

    const channel = interaction.member.voice && interaction.member.voice.channel;

    if (!channel) {
      if (interaction.deferred) {
        return interaction.editReply(t('เข้าห้อง voice ก่อนนะ'));
      }

      return interaction.reply({ content: t('เข้าห้อง voice ก่อนนะ'), ephemeral: true });
    }

    if (!interaction.deferred) {
      await interaction.deferReply();
    }

    const requestedVersion = musicRequestVersion(interaction.guildId);
    const health = await probeRadio(selected);

    if (health.status !== 'online') {
      return interaction.editReply(`${selected.name}: ${t(radioHealthLabels[health.status])}`);
    }

    try {
      await playRadio(interaction.guildId, channel, selected, {
        requestedVersion,
        valid: () =>
          interaction.guild.voiceStates.cache.get(interaction.user.id)?.channelId === channel.id,
      });
      await setSetting(`music_radio_last:${interaction.guildId}`, JSON.stringify(selected)).catch(
        (error) => console.warn('[radio preference]', error.message),
      );
    } catch (error) {
      console.error('[radio] playback failed:', selected.name, error.message);
      return interaction.editReply(
        t('เปิดเสียงวิทยุไม่สำเร็จ สถานีอาจออฟไลน์หรือสตรีมมีปัญหา ลองเลือกสถานีอื่น'),
      );
    }

    await recordMusicAction(interaction, t('เปิดวิทยุ {0}', selected.name));
    await showMusicPanel(interaction);
    return interaction.editReply(
      t('กำลังเปิดวิทยุสด ') +
        selected.name +
        (selected.frequency ? ' (' + selected.frequency + ' MHz)' : ''),
    );
  },
};
