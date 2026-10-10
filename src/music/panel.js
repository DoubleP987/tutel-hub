import { t } from '../i18n/bot.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  StringSelectMenuBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { data } from '../database/connection.js';
import { setting, setSetting } from '../database/settings.js';
import { musicEvents, musicChanged, musicRequestVersion } from './events.js';
import {
  getPlayer,
  enqueue,
  enableRandomMode,
  disableRandomMode,
  pausePlayer,
  resumePlayer,
  skip,
  toggleLoop,
  stop,
  destroyPlayer,
  applySmoothMode,
  setLoop,
  returnToMusic,
} from './player.js';
import {
  getMusicSource,
  setMusicSource,
  musicSourceLabel,
  getSmoothMode,
  setSmoothMode,
  getLoopMode,
  saveLoopMode,
} from './settings.js';
import { openRadioPanel, handleRadioPanel } from './radio-panel.js';
import { playRequest } from './requests.js';
import { randomGenre } from './genres.js';
import { randomGenres } from './genres.js';
import { genreMenuRows } from './genre-menu.js';
import { setRandomGenre } from './settings.js';

let client = null;
function musicSettingsBody(interaction, messageId) {
  const enabled = getSmoothMode(interaction.guildId);
  return {
    content: t(
      'ตั้งค่าเพลงของเซิร์ฟเวอร์นี้ · Smooth transition: {0}\nลดและเพิ่มเสียงช่วงสั้น ๆ พร้อมเตรียมเพลงถัดไป · ใช้กับเพลง ไม่ใช้กับวิทยุสด',
      enabled ? t('เปิด') : t('ปิด'),
    ),
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`music:loop-setting:${interaction.user.id}:${messageId}`)
          .setPlaceholder(t('เลือกโหมด Loop'))
          .addOptions(
            [
              ['off', 'ปิด Loop'],
              ['track', 'Loop song · วนเพลง'],
              ['queue', 'Loop queue · วนคิว'],
            ].map(([value, label]) => ({
              value,
              label: t(label),
              default: getLoopMode(interaction.guildId) === value,
            })),
          ),
      ),
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder().setCustomId(`music:source:${interaction.user.id}`).addOptions(
          ['youtube', 'soundcloud'].map((source) => ({
            label: musicSourceLabel(source),
            value: source,
            default: getMusicSource(interaction.guildId) === source,
          })),
        ),
      ),
      new ActionRowBuilder().addComponents(
        ...['enable', 'disable'].map((action) =>
          new ButtonBuilder()
            .setCustomId(`music:smooth:${interaction.user.id}:${messageId}:${action}`)
            .setLabel(t(action === 'enable' ? 'เปิด Smooth transition' : 'ปิด Smooth transition'))
            .setStyle(action === 'enable' ? ButtonStyle.Primary : ButtonStyle.Secondary)
            .setDisabled(action === 'enable' ? enabled : !enabled),
        ),
      ),
    ],
  };
}
let refreshTimer = null;
const locks = new Map();
const timers = new Map();
const pending = new Map();
const fingerprints = new Map();
const busy = new Set();
const cooldowns = new Map();
const key = (guildId) => `music_panel:${guildId}`;
const text = (value, max = 160) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/([\\`*_<>|])/g, '\\$1')
    .slice(0, max);
const clock = (seconds) =>
  `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

function storedPanel(guildId) {
  try {
    return JSON.parse(setting(key(guildId)) || 'null');
  } catch {
    return null;
  }
}
function serialize(guildId, operation) {
  const previous = locks.get(guildId) || Promise.resolve();
  const next = previous.catch(() => {}).then(operation);
  locks.set(guildId, next);
  void next
    .finally(() => {
      if (locks.get(guildId) === next) locks.delete(guildId);
    })
    .catch(() => {});
  return next;
}
function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
function snapshotTrack(state, fallback) {
  const track = state?.current;
  if (track)
    return {
      title: track.title,
      url: track.url,
      duration: track.duration,
      artist: track.artist,
      thumbnail: track.thumbnail,
    };
  if (state?.radio) return { title: t('วิทยุสด · {0}', state.radio.name), duration: 0 };
  return fallback || null;
}
function panelBody(guildId, record) {
  const state = getPlayer(guildId);
  const track = state?.current;
  const last = snapshotTrack(state, record.lastTrack);
  const status = state?.player.state.status;
  const paused = status === 'paused' || status === 'autopaused';
  const active = !!(track || state?.radio);
  const searching = pending.get(guildId) || (state?.loadingNext ? t('กำลังค้นหาเพลง…') : null);
  const label =
    searching ||
    (active
      ? paused
        ? t('⏸ พักอยู่')
        : status === 'playing'
          ? t('▶️ กำลังเล่น')
          : t('⏳ กำลังเปิดเสียง…')
      : state?.randomMode
        ? t('🔎 กำลังหาเพลงถัดไป…')
        : t('⏹ หยุดแล้ว'));
  const title = text(last?.title || t('ยังไม่มีเพลง'), 200);
  const elapsed = Math.max(
    0,
    Math.floor(
      ((state?.stream?.resource?.playbackDuration || 0) - (state?.trackStartedAtResourceMs || 0)) /
        1000,
    ),
  );
  const progress =
    active && !state?.radio
      ? `${clock(elapsed)} / ${last?.duration ? clock(last.duration) : t('ไม่ทราบความยาว')}`
      : state?.radio
        ? t('ถ่ายทอดสด')
        : last?.duration
          ? t('ความยาว {0}', clock(last.duration))
          : '';
  const actualSource = track?.url?.includes('soundcloud.com')
    ? 'SoundCloud'
    : track?.url?.includes('youtu')
      ? 'YouTube'
      : null;
  const queue = (state?.queue || [])
    .slice(0, 3)
    .map((item, index) => `${index + 1}. ${text(item.title, 130)}`)
    .join('\n');
  const embed = new EmbedBuilder()
    .setColor(paused ? 0xfbbc04 : 0x4285f4)
    .setTitle('🐢 Tutel Music')
    .setDescription(
      `${active ? t('**กำลังเล่น**') : t('**เพลงล่าสุด**')}\n${title}\n\n${label}${progress ? ' · ' + progress : ''}${actualSource ? ' · ' + actualSource : ''}`,
    )
    .addFields(
      {
        name: t('สุ่มต่อเนื่อง'),
        value: state?.randomMode
          ? t('🔀 แนวเพลง: {0}', t(randomGenre(state.randomGenre).label))
          : t('ปิด'),
        inline: true,
      },
      {
        name: t('วนเพลง'),
        value:
          state?.loopMode === 'queue'
            ? t('🔁 เปิด · วนทั้งคิว')
            : state?.loopMode
              ? t('🔁 เปิด · วนเพลงปัจจุบัน')
              : t('ปิด'),
        inline: true,
      },
      {
        name: t('แหล่งค้นหา'),
        value: musicSourceLabel(getMusicSource(guildId)),
        inline: true,
      },
      {
        name: t('คิวถัดไป · {0} เพลง', state?.queue.length || 0),
        value:
          queue ||
          (state?.randomMode ? t('สุ่มเพลงใหม่เมื่อคิวว่าง') : t('คิวว่าง · กดเพิ่มเพลงได้เลย')),
      },
    )
    .setFooter({
      text: t('Tutel · by Double_P · ปุ่มควบคุมใช้ในห้องเสียงเดียวกับบอท'),
    });
  const image = safeUrl(last?.thumbnail);
  if (image) embed.setThumbnail(image);
  const button = (action, label, style = ButtonStyle.Secondary, disabled = false) =>
    new ButtonBuilder()
      .setCustomId(`music:panel:${action}`)
      .setLabel(label)
      .setStyle(style)
      .setDisabled(disabled);
  return {
    embeds: [embed],
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        button('toggle', paused ? t('▶ เล่นต่อ') : t('⏸ พัก'), ButtonStyle.Primary, !active),
        button('skip', t('⏭ ข้าม'), ButtonStyle.Secondary, !track),
        button(
          'loop',
          state?.loopMode === 'queue'
            ? t('🔁 Loop: คิว')
            : state?.loopMode
              ? t('🔁 Loop: เพลง')
              : t('🔁 Loop: ปิด'),
          state?.loopMode ? ButtonStyle.Success : ButtonStyle.Secondary,
          !track || !!state?.radio,
        ),
        button(
          'stop',
          t('⏹ หยุด'),
          ButtonStyle.Danger,
          !active && !state?.randomMode && !state?.queue.length && !searching,
        ),
      ),
      new ActionRowBuilder().addComponents(
        button(
          'random',
          t('🔀 สุ่ม'),
          state?.randomMode ? ButtonStyle.Success : ButtonStyle.Secondary,
        ),
        button('queue', t('📋 ดูคิว')),
        button('add', t('➕ เพิ่มเพลง'), ButtonStyle.Primary),
      ),
      new ActionRowBuilder().addComponents(
        button('settings', t('⚙ ตั้งค่า')),
        button('radio', t('📻 วิทยุ'), state?.radio ? ButtonStyle.Success : ButtonStyle.Secondary),
        button('leave', t('🚪 ออกจากห้อง'), ButtonStyle.Secondary, !state?.connection),
      ),
    ],
  };
}
async function refresh(guildId) {
  if (!client?.isReady()) return;
  if (!getPlayer(guildId)?.connection && !pending.has(guildId)) {
    await deletePanel(guildId);
    return;
  }
  const record = storedPanel(guildId);
  if (!record?.messageId || !client.guilds.cache.has(guildId)) return;
  const last = snapshotTrack(getPlayer(guildId), record.lastTrack);
  if (last && JSON.stringify(last) !== JSON.stringify(record.lastTrack)) {
    record.lastTrack = last;
    await setSetting(key(guildId), JSON.stringify(record));
  }
  const body = panelBody(guildId, record);
  const fingerprint = JSON.stringify(body);
  if (fingerprints.get(guildId) === fingerprint) return;
  try {
    const channel = await client.channels.fetch(record.channelId);
    const message = await channel.messages.fetch(record.messageId);
    await message.edit(body);
    fingerprints.set(guildId, fingerprint);
  } catch (error) {
    // Recreate only on the next play request, never continually post replacement panels.
    if (error.code === 10008 || error.code === 10003) {
      record.messageId = null;
      await setSetting(key(guildId), JSON.stringify(record));
      fingerprints.delete(guildId);
    } else throw error;
  }
}
async function scheduleRefresh(guildId, lastTrack = null) {
  if (lastTrack) {
    const record = storedPanel(guildId);
    const saved = snapshotTrack({ current: lastTrack }, null);
    if (record && JSON.stringify(record.lastTrack) !== JSON.stringify(saved)) {
      record.lastTrack = saved;
      await setSetting(key(guildId), JSON.stringify(record));
    }
  }
  if (!client || timers.has(guildId)) return;
  const timer = setTimeout(() => {
    timers.delete(guildId);
    void serialize(guildId, () => refresh(guildId)).catch((error) =>
      console.error('[music panel] update:', error.message),
    );
  }, 1200);
  timer.unref();
  timers.set(guildId, timer);
}
export function musicPanelPending(guildId, value = null) {
  if (value) pending.set(guildId, value);
  else pending.delete(guildId);
  musicChanged(guildId);
}
export async function ensureMusicPanel(interaction) {
  return serialize(interaction.guildId, async () => {
    const guildId = interaction.guildId;
    const old = storedPanel(guildId);
    const channel = interaction.channel;
    if (!channel?.isSendable?.()) throw new Error(t('ช่องนี้ส่งแผงควบคุมไม่ได้'));
    if (old?.messageId) {
      try {
        const previousChannel = await client.channels.fetch(old.channelId);
        const previous = await previousChannel.messages.fetch(old.messageId);
        const body = panelBody(guildId, old);
        await previous.edit(body);
        fingerprints.set(guildId, JSON.stringify(body));
        return;
      } catch (error) {
        if (![10008, 10003].includes(error.code)) throw error;
      }
    }
    const record = {
      channelId: interaction.channelId,
      messageId: null,
      lastTrack: old?.lastTrack || null,
    };
    const body = panelBody(guildId, record);
    const message = await channel.send({
      ...body,
      flags: MessageFlags.SuppressNotifications,
    });
    record.messageId = message.id;
    record.lastTrack = snapshotTrack(getPlayer(guildId), record.lastTrack);
    await setSetting(key(guildId), JSON.stringify(record));
    fingerprints.set(guildId, JSON.stringify(body));
  });
}
export async function removeMusicPanel(guildId) {
  return serialize(guildId, () => deletePanel(guildId));
}
async function deletePanel(guildId) {
  clearTimeout(timers.get(guildId));
  timers.delete(guildId);
  pending.delete(guildId);
  const record = storedPanel(guildId);
  if (record?.messageId && client) {
    try {
      const channel = await client.channels.fetch(record.channelId);
      const message = await channel.messages.fetch(record.messageId);
      await message.delete();
    } catch (error) {
      if (![10008, 10003].includes(error.code)) throw error;
    }
  }
  await setSetting(key(guildId), 'null');
  fingerprints.delete(guildId);
}
function onMusicLeave(guildId) {
  void removeMusicPanel(guildId).catch((error) =>
    console.error('[music panel] remove:', error.code || error.name),
  );
}
export async function showMusicPanel(interaction) {
  try {
    await ensureMusicPanel(interaction);
  } catch (error) {
    console.error('[music panel] create:', error.message);
    await interaction
      .followUp({
        content: t(
          'เปิดแผงเพลงไม่สำเร็จ ตรวจสิทธิ์ View Channel, Send Messages, Embed Links และ Read Message History ของบอท',
        ),
        flags: MessageFlags.Ephemeral,
      })
      .catch(() => {});
  }
}
export async function initializeMusicPanels(discordClient) {
  client = discordClient;
  fingerprints.clear();
  musicEvents.off('change', scheduleRefresh);
  musicEvents.on('change', scheduleRefresh);
  musicEvents.off('cancel', musicPanelPending);
  musicEvents.on('cancel', musicPanelPending);
  musicEvents.off('leave', onMusicLeave);
  musicEvents.on('leave', onMusicLeave);
  clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    for (const guildId of client?.guilds.cache.keys() || []) {
      const state = getPlayer(guildId);
      if (state?.current && state.player.state.status === 'playing') await scheduleRefresh(guildId);
    }
  }, 15000);
  refreshTimer.unref();
  for (const row of await data.findMany('app_settings', {
    key: { $like: 'music_panel:%' },
  })) {
    const guildId = row.key.slice('music_panel:'.length);
    await removeMusicPanel(guildId).catch((error) =>
      console.warn('[music panel] restore:', error.message),
    );
  }
}
export async function stopMusicPanels() {
  clearInterval(refreshTimer);
  musicEvents.off('change', scheduleRefresh);
  musicEvents.off('cancel', musicPanelPending);
  musicEvents.off('leave', onMusicLeave);
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  for (const guildId of client?.guilds.cache.keys() || [])
    await removeMusicPanel(guildId).catch(() => {});
  client = null;
  pending.clear();
  busy.clear();
  cooldowns.clear();
}

async function privateReply(interaction, content) {
  if (interaction.deferred || interaction.replied)
    return interaction.editReply({ content, components: [] });
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}
async function voiceChannelFor(interaction) {
  const id = interaction.guild.voiceStates.cache.get(interaction.user.id)?.channelId;
  const current = getPlayer(interaction.guildId)?.connection?.joinConfig.channelId;
  if (!id || (current && current !== id)) {
    await privateReply(
      interaction,
      current ? t('เข้าห้องเสียงเดียวกับบอทก่อนกดควบคุมครับ') : t('เข้าห้องเสียงก่อนนะ'),
    );
    return null;
  }
  return interaction.guild.channels.cache.get(id) || interaction.guild.channels.fetch(id);
}
function queueBody(interaction, page) {
  const queue = getPlayer(interaction.guildId)?.queue || [];
  const pages = Math.max(1, Math.ceil(queue.length / 10));
  const selected = Math.min(Math.max(0, page), pages - 1);
  return {
    content:
      t('📋 **คิวเพลง · {0} รายการ**\n', queue.length) +
      (queue
        .slice(selected * 10, selected * 10 + 10)
        .map((track, index) => `${selected * 10 + index + 1}. ${text(track.title, 140)}`)
        .join('\n') || t('คิวว่าง')) +
      t('\n\nหน้า {0}/{1}', selected + 1, pages),
    allowedMentions: { parse: [] },
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`music:queue:${interaction.user.id}:${selected - 1}`)
          .setLabel(t('ก่อนหน้า'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(selected === 0),
        new ButtonBuilder()
          .setCustomId(`music:queue:${interaction.user.id}:${selected + 1}`)
          .setLabel(t('ถัดไป'))
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(selected === pages - 1),
      ),
    ],
  };
}
export async function handleMusicPanelInteraction(interaction) {
  if (!interaction.customId?.startsWith('music:')) return false;
  if (!interaction.inGuild()) {
    await privateReply(interaction, t('ใช้แผงเพลงในเซิร์ฟเวอร์เท่านั้น'));
    return true;
  }
  const parts = interaction.customId.split(':');
  if (await handleRadioPanel(interaction, voiceChannelFor)) return true;
  if (parts[1] === 'loop-setting') {
    const record = storedPanel(interaction.guildId);
    if (
      parts[2] !== interaction.user.id ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      record?.messageId !== parts[3]
    ) {
      await privateReply(interaction, t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์และใช้เมนูของคุณเอง'));
      return true;
    }
    await interaction.deferUpdate();
    const mode = interaction.values[0];
    await saveLoopMode(interaction.guildId, mode);
    setLoop(interaction.guildId, mode);
    await interaction.editReply(musicSettingsBody(interaction, record.messageId));
    return true;
  }
  if (parts[1] === 'smooth') {
    if (
      parts[2] !== interaction.user.id ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      await privateReply(interaction, t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนแหล่งเพลง'));
      return true;
    }
    const record = storedPanel(interaction.guildId);
    if (!record || record.messageId !== parts[3] || !['enable', 'disable'].includes(parts[4])) {
      await privateReply(interaction, t('แผงนี้ไม่ได้ใช้งานแล้ว ให้ใช้แผงเพลงล่าสุด'));
      return true;
    }
    await interaction.deferUpdate();
    const enabled = await setSmoothMode(interaction.guildId, parts[4] === 'enable');
    applySmoothMode(interaction.guildId, enabled);
    await interaction.editReply(musicSettingsBody(interaction, record.messageId));
    return true;
  }
  if (parts[1] === 'queue') {
    if (parts[2] !== interaction.user.id) {
      await privateReply(interaction, t('ปุ่มนี้เป็นของผู้เปิดคิว'));
      return true;
    }
    await interaction.update(queueBody(interaction, Number(parts[3]) || 0));
    return true;
  }
  if (parts[1] === 'source') {
    if (
      parts[2] !== interaction.user.id ||
      !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)
    ) {
      await privateReply(interaction, t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนแหล่งเพลง'));
      return true;
    }
    await interaction.deferUpdate();
    const source = await setMusicSource(interaction.guildId, interaction.values[0]);
    musicChanged(interaction.guildId);
    const record = storedPanel(interaction.guildId);
    await interaction.editReply(
      record
        ? musicSettingsBody(interaction, record.messageId)
        : {
            content: t('บันทึกแหล่งเพลงของเซิร์ฟเวอร์นี้เป็น {0} แล้ว', musicSourceLabel(source)),
            components: [],
          },
    );
    return true;
  }
  const record = storedPanel(interaction.guildId);
  if (parts[1] === 'genre' && parts[2] !== interaction.user.id) {
    await privateReply(interaction, t('เมนูนี้เป็นของผู้เปิด'));
    return true;
  }
  const origin =
    parts[1] === 'genre'
      ? parts[3]
      : interaction.isModalSubmit()
        ? parts[2]
        : interaction.message?.id;
  if (!record?.messageId || origin !== record.messageId) {
    await privateReply(interaction, t('แผงนี้ไม่ได้ใช้งานแล้ว ให้ใช้แผงเพลงล่าสุด'));
    return true;
  }
  const action = parts[1] === 'genre' ? 'genre-select' : parts[1] === 'add' ? 'submit' : parts[2];
  if (action === 'radio' && !getPlayer(interaction.guildId)?.radio) {
    if (!(await voiceChannelFor(interaction))) return true;
    await openRadioPanel(interaction, record.messageId);
    return true;
  }
  if (action === 'genre' || action === 'random') {
    if (!(await voiceChannelFor(interaction))) return true;
    const randomState = getPlayer(interaction.guildId);
    await interaction.reply({
      content: t('เลือกแนวสุ่มเพลง · เพลงปัจจุบันเล่นต่อ เพลงถัดไปใช้แนวที่เลือก'),
      flags: MessageFlags.Ephemeral,
      components: genreMenuRows(interaction.user.id, record.messageId, {
        enabled: !!randomState?.randomMode,
        genre: randomState?.randomGenre,
      }),
    });
    return true;
  }
  if (action === 'queue') {
    await interaction.reply({
      ...queueBody(interaction, 0),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  if (action === 'settings') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await privateReply(interaction, t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนแหล่งเพลง'));
      return true;
    }
    await interaction.reply({
      ...musicSettingsBody(interaction, record.messageId),
      flags: MessageFlags.Ephemeral,
    });
    return true;
  }
  const voice = await voiceChannelFor(interaction);
  if (!voice) return true;
  if (action === 'add') {
    const modal = new ModalBuilder()
      .setCustomId(`music:add:${record.messageId}`)
      .setTitle(t('เพิ่มเพลงลงคิว'))
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('query')
            .setLabel(t('ชื่อเพลงหรือ URL'))
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(500),
        ),
      );
    await interaction.showModal(modal);
    return true;
  }
  const guildId = interaction.guildId;
  const urgent = action === 'stop' || action === 'leave';
  if (!urgent && (busy.has(guildId) || (cooldowns.get(guildId) || 0) > Date.now())) {
    await privateReply(interaction, t('กำลังทำคำสั่งก่อนหน้า รอสักครู่แล้วกดใหม่ครับ'));
    return true;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const ownsBusy = !busy.has(guildId);
  if (ownsBusy) busy.add(guildId);
  cooldowns.set(guildId, Date.now() + 1200);
  try {
    const state = getPlayer(guildId);
    let result;
    if (action === 'genre-select' && parts[4] === 'off') {
      disableRandomMode(guildId);
      result = t('ปิดสุ่มแล้ว เพลงปัจจุบันและเพลงในคิวจะเล่นต่อ');
    } else if (action === 'genre-select') {
      const genre = parts[4] === 'all' ? 'all' : interaction.values?.[0];
      if (!randomGenres.some((item) => item.value === genre)) throw new Error('Invalid genre');
      await setRandomGenre(guildId, genre);
      const updated = await enableRandomMode(guildId, voice);
      result = updated.randomMode
        ? t('เปิดสุ่มแนว {0} แล้ว', t(randomGenre(genre).label))
        : t('โหมดสุ่มถูกหยุดแล้ว');
    } else if (action === 'submit') {
      await playRequest(interaction, {
        query: interaction.fields.getTextInputValue('query').trim(),
        voiceChannel: voice,
      });
      return true;
    } else if (action === 'radio' || action === 'music') {
      result = (await returnToMusic(guildId))
        ? t('กลับไปเพลงแล้ว · เพลงที่พักไว้เริ่มจากต้นเพลง')
        : t('ไม่มีคิวเพลงที่พักไว้');
    } else if (action === 'toggle') {
      const paused = ['paused', 'autopaused'].includes(state?.player.state.status);
      result = (paused ? resumePlayer(guildId) : pausePlayer(guildId))
        ? paused
          ? t('เล่นต่อแล้ว')
          : t('พักเพลงแล้ว')
        : t('ไม่มีเพลงให้ควบคุม');
    } else if (action === 'loop') {
      const enabled = toggleLoop(guildId);
      result =
        enabled === null
          ? t('ไม่มีเพลงให้วน · วิทยุสดไม่รองรับ Loop')
          : enabled === 'queue'
            ? t('เปิดวนทั้งคิวแล้ว')
            : enabled
              ? t('เปิดวนเพลงแล้ว · ปุ่มข้ามยังไปเพลงถัดไปได้')
              : t('ปิดวนเพลงแล้ว');
    } else if (action === 'skip')
      result = skip(guildId) ? t('ข้ามเพลงแล้ว') : t('ไม่มีเพลงให้ข้าม');
    else if (action === 'stop') {
      stop(guildId);
      result = t('หยุดเพลง ล้างคิวและปิดสุ่มแล้ว · จำค่า Loop ไว้');
    } else if (action === 'leave') {
      destroyPlayer(guildId);
      result = t('ออกจากห้องเสียงแล้ว');
    } else if (action === 'random') {
      if (state?.randomMode) {
        disableRandomMode(guildId);
        result = t('ปิดสุ่มแล้ว เพลงปัจจุบันและเพลงในคิวจะเล่นต่อ');
      } else {
        const updated = await enableRandomMode(guildId, voice);
        result = updated.randomMode ? t('เปิดสุ่มต่อเนื่องแล้ว') : t('โหมดสุ่มถูกหยุดแล้ว');
      }
    } else result = t('ไม่รู้จักปุ่มนี้');
    await privateReply(interaction, result);
  } finally {
    if (ownsBusy) busy.delete(guildId);
    musicPanelPending(guildId);
    musicChanged(guildId);
  }
  return true;
}
