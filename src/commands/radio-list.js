import { musicRequestVersion } from '../music/events.js';
import { t } from '../i18n/bot.js';
import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  RADIO_STATIONS,
  getRadioDirectory,
  stationMatchesRegion,
  stationFrequency,
  radioCategory,
} from '../music/radio-directory.js';
import { playRadio } from '../music/player.js';
import { showMusicPanel, recordMusicAction } from '../music/panel.js';
import { setting, setSetting } from '../database/settings.js';
import { radioAreas, radioCategories } from '../music/radio-panel.js';
import { probeRadio, radioHealthLabels } from '../music/radio-health.js';

const sessions = new Map();
const lifetime = 3 * 60 * 1000;
function cleanSessions() {
  for (const [id, session] of sessions) if (session.expires <= Date.now()) sessions.delete(id);
}

export async function showRadioList(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
  ];
  const allStations = stations;
  const filtered = stations.filter(
    (station) =>
      (!area ||
        station.region === area ||
        (area === 'south' && station.region === 'hatyai') ||
        stationMatchesRegion(station, area)) &&
      (!category || radioCategory(station) === category),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  if (!filtered.length || page > pages)
    return interaction.editReply(t('ไม่พบสถานีในหน้าหรือหมวดนี้'));
  cleanSessions();
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
  const id = randomUUID();
  const session = {
    id,
    owner: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    stations: filtered,
    allStations,
    area: area || 'all',
    category: category || 'all',
    query: '',
    page,
    expires: Date.now() + lifetime,
    busy: false,
  };
  sessions.set(id, session);
  return interaction.editReply(await radioListBody(session));
}

async function radioListBody(session, refresh = false) {
  const { stations, page, id } = session;
  const pages = Math.max(1, Math.ceil(stations.length / 10));
  const rows = stations.slice((page - 1) * 10, page * 10);
  const statuses = await Promise.all(rows.map((station) => probeRadio(station, { refresh })));
  const lines = rows.map(
    (station, index) =>
      `${t(radioHealthLabels[statuses[index].status])} · **${station.name.replace(/[*`\n]/g, '').slice(0, 85)}**${station.frequency ? ` (${station.frequency} FM)` : ''}`,
  );
  const button = (action, label, disabled = false) =>
    new ButtonBuilder()
      .setCustomId(`radio:list:${id}:${action}`)
      .setLabel(t(label))
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled);
  return {
    content:
      t('📻 สถานีวิทยุ · หน้า {0}/{1}\n', page, pages) +
      lines.join('\n') +
      t(
        '\nเลือกสถานีจากเมนูด้านล่างเพื่อเล่น · เพลงเดิมยังเล่นระหว่างตรวจ\nสถานะตรวจจากเครื่องบอท ณ เวลาที่ตรวจ อาจเปลี่ยนได้',
      ),
    allowedMentions: { parse: [] },
    components: [
      ...(rows.length
        ? [
            new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(`radio:list:${id}:play`)
                .setPlaceholder(t('เลือกสถานีเพื่อเล่น'))
                .addOptions(
                  rows.map((station, index) => ({
                    label: (
                      radioHealthLabels[statuses[index].status].split(' ')[0] +
                      ' ' +
                      station.name
                    ).slice(0, 100),
                    value: String((page - 1) * 10 + index),
                    description:
                      `${station.frequency || ''} ${station.region || station.state || ''}`.slice(
                        0,
                        100,
                      ) || 'Online radio',
                  })),
                ),
            ),
          ]
        : []),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`radio:list:${id}:area`)
          .setPlaceholder(t('เลือกพื้นที่'))
          .addOptions(
            Object.entries(radioAreas).map(([value, label]) => ({
              value,
              label: t(label),
              default: session.area === value,
            })),
          ),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`radio:list:${id}:category`)
          .setPlaceholder(t('เลือกประเภทสถานี'))
          .addOptions(
            Object.entries(radioCategories).map(([value, label]) => ({
              value,
              label: t(label),
              default: session.category === value,
            })),
          ),
      ),
      new ActionRowBuilder().addComponents(
        button('prev', '◀ ก่อนหน้า', page === 1),
        button('next', 'ถัดไป ▶', page === pages),
        button('refresh', '↻ ตรวจสถานะใหม่'),
        button('search', 'ค้นหาสถานี'),
      ),
      new ActionRowBuilder().addComponents(
        button('last', 'เล่นสถานีล่าสุด', !setting(`music_radio_last:${session.guildId}`)),
        button('clear', 'ล้างคำค้น', !session.query),
      ),
    ],
  };
}

function filterStations(session) {
  session.stations = session.allStations.filter(
    (station) =>
      (session.area === 'all' ||
        station.region === session.area ||
        (session.area === 'south' && station.region === 'hatyai') ||
        stationMatchesRegion(station, session.area)) &&
      (session.category === 'all' || radioCategory(station) === session.category) &&
      (!session.query ||
        `${station.name} ${station.frequency} ${station.tags || ''} ${station.state || ''}`
          .toLowerCase()
          .includes(session.query.toLowerCase())),
  );
  session.page = 1;
}

export async function handleRadioListButton(interaction) {
  if (!interaction.customId?.startsWith('radio:list:')) return false;
  cleanSessions();
  const [, , id, action] = interaction.customId.split(':');
  const session = sessions.get(id);
  if (
    !session ||
    session.owner !== interaction.user.id ||
    session.guildId !== interaction.guildId ||
    session.channelId !== interaction.channelId
  ) {
    await interaction.reply({
      content: t('รายการนี้หมดอายุหรือไม่ใช่ของคุณ ใช้ /radio list เปิดใหม่'),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  if (action === 'search') {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`radio:list:${id}:query`)
        .setTitle(t('ค้นหาสถานีวิทยุ'))
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('query')
              .setLabel(t('ชื่อสถานีหรือความถี่'))
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(100),
          ),
        ),
    );
    return true;
  }
  if (action === 'play' || action === 'last') {
    if (session.busy) {
      await interaction.reply({
        content: t('กำลังตรวจสถานี รอสักครู่'),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    let station;
    if (action === 'last') {
      try {
        station = JSON.parse(setting(`music_radio_last:${session.guildId}`) || 'null');
      } catch {}
    } else {
      const index = Number(interaction.values[0]);
      if (Number.isInteger(index) && index >= (session.page - 1) * 10 && index < session.page * 10)
        station = session.stations[index];
    }
    const voice = interaction.member.voice?.channel;
    const { getPlayer } = await import('../music/player.js');
    const connected = getPlayer(session.guildId)?.connection?.joinConfig.channelId;
    if (!station || !voice || (connected && connected !== voice.id)) {
      await interaction.reply({
        content: t('เลือกสถานีจากหน้าปัจจุบันและเข้าห้องเสียงเดียวกับบอทก่อน'),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    session.busy = true;
    const requestedVersion = musicRequestVersion(session.guildId);
    try {
      const health = await probeRadio(station, { refresh: true });
      if (health.status !== 'online') {
        await interaction.editReply(
          `${station.name}: ${t(radioHealthLabels[health.status])}\n${t('เพลงเดิมยังเล่นต่อ เลือกสถานีอื่นได้')}`,
        );
        return true;
      }
      await playRadio(session.guildId, voice, station, {
        requestedVersion,
        valid: () =>
          interaction.guild.voiceStates.cache.get(interaction.user.id)?.channelId === voice.id,
      });
      await setSetting(
        `music_radio_last:${session.guildId}`,
        JSON.stringify({
          name: station.name,
          url: station.url,
          frequency: station.frequency,
          region: station.region,
        }),
      ).catch((error) => console.warn('[radio preference]', error.message));
      await recordMusicAction(interaction, t('เปิดวิทยุ {0}', station.name));
      await showMusicPanel(interaction);
      await interaction.editReply(t('กำลังเปิดวิทยุสด ') + station.name);
    } catch (error) {
      console.warn('[radio select]', error.message);
      await interaction.editReply(t('เปิดวิทยุไม่สำเร็จ เพลงเดิมยังเล่นต่อ เลือกสถานีอื่นได้'));
    } finally {
      session.busy = false;
    }
    return true;
  }
  if (!['prev', 'next', 'refresh', 'area', 'category', 'query', 'clear'].includes(action)) {
    await interaction.deferUpdate();
    return true;
  }
  if (action === 'query') await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  else await interaction.deferUpdate();
  if (session.busy) return true;
  session.busy = true;
  const previous = session.page;
  try {
    if (action === 'area')
      session.area = Object.hasOwn(radioAreas, interaction.values[0])
        ? interaction.values[0]
        : 'all';
    if (action === 'category')
      session.category = Object.hasOwn(radioCategories, interaction.values[0])
        ? interaction.values[0]
        : 'all';
    if (action === 'query') session.query = interaction.fields.getTextInputValue('query').trim();
    if (action === 'clear') session.query = '';
    if (['area', 'category', 'query', 'clear'].includes(action)) filterStations(session);
    const pages = Math.max(1, Math.ceil(session.stations.length / 10));
    session.page = Math.max(
      1,
      Math.min(pages, session.page + (action === 'prev' ? -1 : action === 'next' ? 1 : 0)),
    );
    await interaction.editReply(await radioListBody(session, action === 'refresh'));
  } catch (error) {
    session.page = previous;
    console.warn('[radio list]', error.message);
    await interaction
      .followUp({
        content: t('โหลดหน้าสถานีไม่สำเร็จ ลองกดอีกครั้ง'),
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
  } finally {
    session.busy = false;
  }
  return true;
}
