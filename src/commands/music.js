import { t } from '../i18n/bot.js';
import { resolveTrack } from '../music/stream.js';
import {
  enqueue,
  enableRandomMode,
  getPlayer,
  skip,
  stop,
  destroyPlayer,
} from '../music/player.js';
import { duration, guildOnly } from './shared.js';
import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { getMusicSource, setMusicSource, musicSourceLabel } from '../music/settings.js';
import { showMusicPanel, musicPanelPending } from '../music/panel.js';
import { musicRequestVersion } from '../music/events.js';

export const musicHandlers = {
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
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: t('เข้าห้อง voice ก่อนนะ'), ephemeral: true });
    await interaction.deferReply();
    const version = musicRequestVersion(interaction.guildId);
    musicPanelPending(interaction.guildId, t('กำลังค้นหาเพลง…'));
    await showMusicPanel(interaction);
    try {
      if (version !== musicRequestVersion(interaction.guildId))
        return interaction.editReply(t('ยกเลิกการเพิ่มเพลงแล้ว'));
      const track = await resolveTrack(
        interaction.options.getString('query', true),
        getMusicSource(interaction.guildId),
      );
      if (version !== musicRequestVersion(interaction.guildId))
        return interaction.editReply(
          t('ยกเลิกการเพิ่มเพลงแล้ว เพราะบอทถูกสั่งหยุดหรือเปลี่ยนโหมด'),
        );
      const voiceId = interaction.guild.voiceStates.cache.get(interaction.user.id)?.channelId;
      if (voiceId !== channel.id)
        return interaction.editReply(
          t('ยกเลิกการเพิ่มเพลง เพราะคุณออกหรือเปลี่ยนห้องเสียงระหว่างค้นหา'),
        );
      const count = enqueue(interaction.guildId, channel, track);
      return interaction.editReply(
        t('เพิ่ม **') +
          track.title +
          '**' +
          (track.duration ? ' (' + duration(track.duration) + ')' : '') +
          t(' ในคิวแล้ว · รอ ') +
          count +
          t(' เพลง'),
      );
    } catch (error) {
      console.error('[play] failed:', error.message);
      return interaction.editReply(
        t('ค้นหาหรือเปิดเพลงไม่สำเร็จ ลองใส่ชื่อเพลงพร้อมศิลปินหรือลิงก์เพลงโดยตรง'),
      );
    } finally {
      musicPanelPending(interaction.guildId);
    }
  },

  async randommusic(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel)
      return interaction.reply({ content: t('เข้าห้อง voice ก่อนนะ'), ephemeral: true });
    await interaction.deferReply();
    const version = musicRequestVersion(interaction.guildId);
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
      ...state.queue.slice(0, 10).map((t, n) => n + 1 + '. ' + t.title),
    ];
    if (state.queue.length > 10) lines.push(t('และอีก ') + (state.queue.length - 10) + t(' เพลง'));
    return interaction.reply(lines.join('\n'));
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
