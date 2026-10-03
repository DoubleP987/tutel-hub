import { t } from '../i18n/bot.js';
import { playRequest } from '../music/requests.js';
import {
  editQueue,
  setLoop,
  enableRandomMode,
  getPlayer,
  skip,
  stop,
  destroyPlayer,
  joinStandby,
} from '../music/player.js';
import { duration, guildOnly } from './shared.js';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  getMusicSource,
  setMusicSource,
  musicSourceLabel,
  getRandomGenre,
  setRandomGenre,
} from '../music/settings.js';
import { randomGenre, randomGenres } from '../music/genres.js';
import { showMusicPanel, musicPanelPending } from '../music/panel.js';
import { musicRequestVersion } from '../music/events.js';

export const musicHandlers = {
  async join(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice?.channel;
    if (!channel)
      return interaction.reply({
        content: t('เข้าห้อง voice ก่อนนะ'),
        flags: MessageFlags.Ephemeral,
      });
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    await joinStandby(interaction.guildId, channel);
    await showMusicPanel(interaction);
    return interaction.editReply(t('เข้าห้องเสียงมารอแล้ว · ถ้าไม่มีเพลงเล่นครบ 5 นาทีจะออกเอง'));
  },
  async music(interaction) {
    if (!guildOnly(interaction)) return;
    const source = interaction.options.getString('source');
    if (source && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({
        content: t('ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนแหล่งเพลง'),
        flags: MessageFlags.Ephemeral,
      });
    const selected = source
      ? await setMusicSource(interaction.guildId, source)
      : getMusicSource(interaction.guildId);
    return interaction.reply({
      content: t(
        'แหล่งค้นหาเพลงของเซิร์ฟเวอร์นี้: **{0}**\nใช้กับ /play และ /randommusic เพลงที่อยู่ในคิวแล้วจะเล่นต่อจากแหล่งเดิม และลิงก์ตรงจะใช้แหล่งของลิงก์นั้น',
        musicSourceLabel(selected),
      ),
      flags: MessageFlags.Ephemeral,
    });
  },
  async play(interaction) {
    if (!guildOnly(interaction)) return;
    return playRequest(interaction, { query: interaction.options.getString('query', true) });
  },
  async playnext(interaction) {
    if (!guildOnly(interaction)) return;
    return playRequest(interaction, {
      query: interaction.options.getString('query', true),
      next: true,
    });
  },
  async remove(interaction) {
    return changeQueue(interaction, 'remove');
  },
  async move(interaction) {
    return changeQueue(interaction, 'move');
  },
  async clearqueue(interaction) {
    return changeQueue(interaction, 'clear');
  },
  async shuffle(interaction) {
    return changeQueue(interaction, 'shuffle');
  },
  async loop(interaction) {
    if (!(await canControl(interaction))) return;
    const mode = setLoop(interaction.guildId, interaction.options.getString('mode', true));
    return interaction.reply({
      content:
        mode === null
          ? t('ไม่มีเพลงให้วน · วิทยุสดไม่รองรับ Loop')
          : mode === 'queue'
            ? t('เปิดวนทั้งคิวแล้ว')
            : mode === 'track'
              ? t('เปิดวนเพลงแล้ว · ปุ่มข้ามยังไปเพลงถัดไปได้')
              : t('ปิดวนเพลงแล้ว'),
      flags: MessageFlags.Ephemeral,
    });
  },

  async randommusic(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: t('เข้าห้อง voice ก่อนนะ'), ephemeral: true });
    await interaction.deferReply();
    const version = musicRequestVersion(interaction.guildId);
    const genre = interaction.options.getString('genre');
    if (genre && !randomGenres.some((item) => item.value === genre))
      return interaction.editReply(t('เลือกแนวเพลงจากรายการแนะนำ หรือเว้นว่างเพื่อใช้แนวล่าสุด'));
    if (genre) await setRandomGenre(interaction.guildId, genre);
    await showMusicPanel(interaction);
    if (version !== musicRequestVersion(interaction.guildId))
      return interaction.editReply(t('ยกเลิกการสุ่มเพลงแล้ว'));
    const state = await enableRandomMode(interaction.guildId, channel);
    if (!state.randomMode) return interaction.editReply(t('โหมดสุ่มถูกหยุดแล้ว'));
    const playing = state.player.state.status === 'playing' && state.current;
    return interaction.editReply(
      t(
        'เปิดโหมดสุ่มเพลงเดี่ยวจาก {0} แล้ว · คละศิลปินและแนวเพลง\n',
        musicSourceLabel(getMusicSource(interaction.guildId)),
      ) +
        t('แนวเพลง: {0}\n', t(randomGenre(getRandomGenre(interaction.guildId)).label)) +
        (playing
          ? t('กำลังเล่น **{0}**', state.current.title)
          : t('กำลังค้นหาเพลงที่เปิดได้ ระบบจะข้ามรายการที่เปิดไม่ได้และลองต่ออัตโนมัติ')) +
        t('\nควบคุมเพลงได้จากแผงด้านล่าง · เล่นต่อเนื่องจนกด /stop หรือ /leave'),
    );
  },

  async queue(interaction) {
    if (!guildOnly(interaction)) return;
    const state = getPlayer(interaction.guildId);
    if (!state || (!state.radio && !state.current && !state.queue.length))
      return interaction.reply(t('คิวว่างอยู่'));
    const playing = state.radio
      ? t('วิทยุสด · ') + state.radio.name
      : (state.current && state.current.title) || t('ไม่มี');
    const lines = [
      t('กำลังเล่น: **') + playing + '**',
      ...state.queue
        .slice(0, 10)
        .map((track, n) => n + 1 + '. ' + String(track.title).slice(0, 140)),
    ];
    if (state.queue.length > 10) lines.push(t('และอีก ') + (state.queue.length - 10) + t(' เพลง'));
    return interaction.reply({
      content: lines.join('\n').slice(0, 1950),
      allowedMentions: { parse: [] },
    });
  },
  async skip(interaction) {
    if (!guildOnly(interaction)) return;
    if (getPlayer(interaction.guildId) && getPlayer(interaction.guildId).radio)
      return interaction.reply(
        t('กำลังฟังวิทยุ ใช้ /radio play เพื่อเปลี่ยน หรือ /stop เพื่อหยุด'),
      );
    return interaction.reply(
      skip(interaction.guildId) ? t('ข้ามเพลงแล้ว') : t('ไม่มีเพลงที่กำลังเล่น'),
    );
  },
  async stop(interaction) {
    if (!guildOnly(interaction)) return;
    stop(interaction.guildId);
    return interaction.reply(t('หยุดเพลงและล้างคิวแล้ว'));
  },
  async pause(interaction) {
    if (!guildOnly(interaction)) return;
    const ok = getPlayer(interaction.guildId) && getPlayer(interaction.guildId).player.pause();
    return interaction.reply(ok ? t('พักเพลงแล้ว') : t('ไม่มีเพลงที่กำลังเล่น'));
  },
  async resume(interaction) {
    if (!guildOnly(interaction)) return;
    const ok = getPlayer(interaction.guildId) && getPlayer(interaction.guildId).player.unpause();
    return interaction.reply(ok ? t('เล่นเพลงต่อแล้ว') : t('ไม่มีเพลงที่พักอยู่'));
  },
  async nowplaying(interaction) {
    if (!guildOnly(interaction)) return;
    const state = getPlayer(interaction.guildId);
    if (state && state.radio)
      return interaction.reply(
        t('กำลังฟังวิทยุสด ') + state.radio.name + ' (' + state.radio.frequency + ' MHz)',
      );
    const track = state && state.current;
    return interaction.reply(
      track
        ? t('กำลังเล่น **') +
            track.title +
            '**' +
            (track.duration ? ' (' + duration(track.duration) + ')' : '')
        : t('ไม่มีเพลงที่กำลังเล่น'),
    );
  },
  async leave(interaction) {
    if (!guildOnly(interaction)) return;
    destroyPlayer(interaction.guildId);
    return interaction.reply(t('ออกจาก voice channel แล้ว'));
  },
};

async function canControl(interaction) {
  if (!guildOnly(interaction)) return false;
  const voiceId = interaction.member.voice?.channelId;
  const botVoice = getPlayer(interaction.guildId)?.connection?.joinConfig.channelId;
  if (!voiceId || !botVoice || voiceId !== botVoice) {
    await interaction.reply({
      content: t('ต้องอยู่ห้องเสียงเดียวกับบอทเพื่อจัดการคิว'),
      flags: MessageFlags.Ephemeral,
    });
    return false;
  }
  return true;
}
async function changeQueue(interaction, action) {
  if (!(await canControl(interaction))) return;
  const result = editQueue(
    interaction.guildId,
    action,
    interaction.options.getInteger('position'),
    interaction.options.getInteger('to'),
  );
  const message =
    action === 'remove'
      ? result
        ? t('ลบเพลงจากคิวแล้ว: {0}', String(result.title).slice(0, 180))
        : t('ไม่พบตำแหน่งนี้ในคิว')
      : action === 'move'
        ? result
          ? t('ย้ายลำดับเพลงแล้ว')
          : t('ไม่พบตำแหน่งนี้ในคิว')
        : action === 'clear'
          ? t('ล้าง {0} เพลงที่รอแล้ว · เพลงปัจจุบันยังเล่นต่อ', result || 0)
          : t('สุ่มลำดับคิว {0} เพลงแล้ว', result || 0);
  return interaction.reply({
    content: message,
    flags: MessageFlags.Ephemeral,
    allowedMentions: { parse: [] },
  });
}
