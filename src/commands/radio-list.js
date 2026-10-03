import { t } from '../i18n/bot.js';
import { randomUUID } from 'node:crypto';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import {
  RADIO_STATIONS,
  getRadioDirectory,
  stationMatchesRegion,
  stationFrequency,
  radioCategory,
} from '../music/radio-directory.js';
import { probeRadio, radioHealthLabels } from '../music/radio-health.js';

const sessions = new Map();
const lifetime = 12 * 60 * 1000;
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
  cleanSessions();
  if (sessions.size >= 100) sessions.delete(sessions.keys().next().value);
  const id = randomUUID();
  const session = {
    id,
    owner: interaction.user.id,
    guildId: interaction.guildId,
    channelId: interaction.channelId,
    stations,
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
        '\nใช้ /radio play ใส่ชื่อสถานี · กดปุ่มเพื่อเลื่อนหน้า\nสถานะตรวจจากเครื่องบอท ณ เวลาที่ตรวจ อาจเปลี่ยนได้',
      ),
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        button('prev', '◀ ก่อนหน้า', page === 1),
        button('next', 'ถัดไป ▶', page === pages),
        button('refresh', '↻ ตรวจสถานะใหม่'),
      ),
    ],
  };
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
  if (!['prev', 'next', 'refresh'].includes(action)) {
    await interaction.deferUpdate();
    return true;
  }
  await interaction.deferUpdate();
  if (session.busy) return true;
  session.busy = true;
  const previous = session.page;
  try {
    const pages = Math.ceil(session.stations.length / 10);
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
