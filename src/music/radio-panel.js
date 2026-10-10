import { musicRequestVersion } from './events.js';
import { randomUUID } from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import { setting, setSetting } from '../database/settings.js';
import { t } from '../i18n/bot.js';
import {
  RADIO_STATIONS,
  getRadioDirectory,
  radioCategory,
  norm,
  stationFrequency,
  stationMatchesRegion,
} from './radio-directory.js';
import { probeRadio, radioHealthLabels } from './radio-health.js';
import { playRadio } from './player.js';

const sessions = new Map();
export const radioAreas = {
  all: 'ทุกพื้นที่',
  bangkok: 'กรุงเทพ',
  hatyai: 'หาดใหญ่ / สงขลา',
  north: 'ภาคเหนือ',
  northeast: 'ภาคอีสาน',
  central: 'ภาคกลาง',
  east: 'ภาคตะวันออก',
  west: 'ภาคตะวันตก',
  south: 'ภาคใต้',
};
export const radioCategories = {
  all: 'ทุกประเภท',
  news: 'ข่าว / จราจร',
  talk: 'สาระ / ความรู้',
  sport: 'กีฬา',
  music: 'เพลง',
  local: 'ท้องถิ่น',
};

function lastStation(guildId) {
  try {
    return JSON.parse(setting(`music_radio_last:${guildId}`) || 'null');
  } catch {
    return null;
  }
}

async function rowsFor(session) {
  let remote = [];

  try {
    remote = await getRadioDirectory();
  } catch {
    /* Curated stations still work. */
  }

  const rows = [
    ...RADIO_STATIONS,
    ...remote
      .filter((row) => row.url_resolved || row.url)
      .map((row) => ({
        ...row,
        url: row.url_resolved || row.url,
        frequency: stationFrequency(row),
        region: row.state || 'Thailand',
      })),
  ];
  const seen = new Set();
  return rows.filter((station) => {
    if (seen.has(station.url)) {
      return false;
    }

    seen.add(station.url);
    const area = session.area;
    const matchesArea =
      area === 'all' ||
      station.region === area ||
      (area === 'south' && station.region === 'hatyai') ||
      stationMatchesRegion(station, area);
    return (
      matchesArea &&
      (session.category === 'all' || radioCategory(station) === session.category) &&
      (!session.query ||
        norm(
          `${station.name} ${station.frequency} ${station.tags || ''} ${station.region}`,
        ).includes(norm(session.query)))
    );
  });
}

function select(id, options, placeholder) {
  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(id)
      .setPlaceholder(t(placeholder))
      .addOptions(options),
  );
}

function button(session, action, label, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(`music:radio:${session.id}:${action}`)
    .setLabel(t(label))
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
}

async function body(session) {
  session.rows = await rowsFor(session);
  const pages = Math.max(1, Math.ceil(session.rows.length / 20));
  session.page = Math.min(Math.max(0, session.page), pages - 1);
  const page = session.rows.slice(session.page * 20, session.page * 20 + 20);
  const components = [];

  if (page.length) {
    components.push(
      select(
        `music:radio:${session.id}:station`,
        page.map((station, i) => ({
          label: station.name.slice(0, 100),
          value: String(session.page * 20 + i),
          description:
            `${station.frequency ? station.frequency + ' MHz · ' : ''}${station.region || ''}`.slice(
              0,
              100,
            ) || 'Online radio',
        })),
        'เลือกสถานีเพื่อเล่น',
      ),
    );
  }

  components.push(
    select(
      `music:radio:${session.id}:area`,
      Object.entries(radioAreas).map(([value, label]) => ({
        value,
        label: t(label),
        default: session.area === value,
      })),
      'เลือกพื้นที่',
    ),
  );
  components.push(
    select(
      `music:radio:${session.id}:category`,
      Object.entries(radioCategories).map(([value, label]) => ({
        value,
        label: t(label),
        default: session.category === value,
      })),
      'เลือกประเภทสถานี',
    ),
  );
  components.push(
    new ActionRowBuilder().addComponents(
      button(session, 'prev', '◀ ก่อนหน้า', session.page === 0),
      button(session, 'next', 'ถัดไป ▶', session.page === pages - 1),
      button(session, 'search', 'ค้นหาสถานี'),
      button(session, 'clear', 'ล้างคำค้น', !session.query),
    ),
  );

  if (lastStation(session.guildId)) {
    components.push(
      new ActionRowBuilder().addComponents(button(session, 'last', 'เล่นสถานีล่าสุด')),
    );
  }

  return {
    content: `${t('เลือกสถานีวิทยุ · เพลงเดิมยังเล่นระหว่างเลือก')}\n${t(radioAreas[session.area])} · ${t(radioCategories[session.category])} · ${session.page + 1}/${pages} · ${session.rows.length} ${t('สถานี')}${session.query ? '\n' + session.query : ''}\n${t('ตรวจเสียงก่อนสลับ · สถานีอาจไม่พร้อมหรือเงียบในบางช่วง')}`,
    components,
  };
}

export async function openRadioPanel(interaction, messageId) {
  const now = Date.now();

  for (const [id, entry] of sessions) {
    if (entry.expires <= now) {
      sessions.delete(id);
    }
  }

  if (sessions.size >= 100) {
    sessions.delete(sessions.keys().next().value);
  }

  const session = {
    id: randomUUID(),
    guildId: interaction.guildId,
    owner: interaction.user.id,
    messageId,
    expires: now + 3 * 60 * 1000,
    page: 0,
    area: 'all',
    category: 'all',
    query: '',
    rows: [],
  };
  sessions.set(session.id, session);
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  await interaction.editReply(await body(session));
}

export async function handleRadioPanel(interaction, voiceChannelFor) {
  if (!interaction.customId?.startsWith('music:radio:')) {
    return false;
  }

  const [, , id, action] = interaction.customId.split(':');
  const session = sessions.get(id);

  if (
    !session ||
    session.expires <= Date.now() ||
    session.guildId !== interaction.guildId ||
    session.owner !== interaction.user.id
  ) {
    await interaction.reply({
      content: t('เมนูหมดอายุหรือเป็นของผู้ใช้อื่น เปิดวิทยุจากแผงเพลงใหม่'),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }

  if (action === 'search') {
    await interaction.showModal(
      new ModalBuilder()
        .setCustomId(`music:radio:${id}:query`)
        .setTitle(t('ค้นหาสถานีวิทยุ'))
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('query')
              .setLabel(t('ชื่อสถานีหรือความถี่'))
              .setStyle(TextInputStyle.Short)
              .setMaxLength(100)
              .setRequired(true),
          ),
        ),
    );
    return true;
  }

  if (['station', 'last'].includes(action)) {
    const record = JSON.parse(setting(`music_panel:${session.guildId}`) || 'null');

    if (record?.messageId !== session.messageId) {
      await interaction.reply({
        content: t('แผงนี้ไม่ได้ใช้งานแล้ว ให้ใช้แผงเพลงล่าสุด'),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    if (session.busy) {
      await interaction.reply({
        content: t('กำลังตรวจสถานี รอสักครู่'),
        flags: MessageFlags.Ephemeral,
      });
      return true;
    }

    const station =
      action === 'last'
        ? lastStation(session.guildId)
        : session.rows[Number(interaction.values[0])];
    const voice = await voiceChannelFor(interaction);

    if (!voice || !station) {
      return true;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    session.busy = true;
    const requestedVersion = musicRequestVersion(session.guildId);
    let health;

    try {
      health = await probeRadio(station, { refresh: true });
    } catch {
      session.busy = false;
      await interaction.editReply(t('ตรวจสถานีไม่สำเร็จ ลองใหม่อีกครั้ง'));
      return true;
    }

    if (health.status !== 'online') {
      await interaction.editReply(
        `${station.name}: ${t(radioHealthLabels[health.status])}\n${t('เพลงเดิมยังเล่นต่อ เลือกสถานีอื่นได้')}`,
      );
      session.busy = false;
      return true;
    }

    try {
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
      const { recordMusicAction } = await import('./panel.js');
      await recordMusicAction(interaction, t('เปิดวิทยุ {0}', station.name));
      await interaction.editReply(t('กำลังเปิดวิทยุสด ') + station.name);
    } catch (error) {
      console.warn('[radio panel]', error.message);
      await interaction.editReply(t('เปิดวิทยุไม่สำเร็จ เพลงเดิมยังเล่นต่อ เลือกสถานีอื่นได้'));
    } finally {
      session.busy = false;
    }

    return true;
  }

  if (action === 'query') {
    session.query = interaction.fields.getTextInputValue('query').trim();
    session.page = 0;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await interaction.editReply(await body(session));
  } else {
    await interaction.deferUpdate();

    if (action === 'area') {
      session.area = Object.hasOwn(radioAreas, interaction.values[0])
        ? interaction.values[0]
        : 'all';
      session.page = 0;
    }

    if (action === 'category') {
      session.category = Object.hasOwn(radioCategories, interaction.values[0])
        ? interaction.values[0]
        : 'all';
      session.page = 0;
    }

    if (action === 'clear') {
      session.query = '';
      session.page = 0;
    }

    if (action === 'prev') {
      session.page--;
    }

    if (action === 'next') {
      session.page++;
    }

    await interaction.editReply(await body(session));
  }

  return true;
}
