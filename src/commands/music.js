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

export const musicHandlers = {
  async music(interaction) {
    if (!guildOnly(interaction)) return;
    const source = interaction.options.getString('source');
    if (source && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
      return interaction.reply({
        content: 'ต้องมีสิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยนแหล่งเพลง',
        flags: MessageFlags.Ephemeral,
      });
    const selected = source
      ? setMusicSource(interaction.guildId, source)
      : getMusicSource(interaction.guildId);
    return interaction.reply({
      content: `แหล่งค้นหาเพลงของเซิร์ฟเวอร์นี้: **${musicSourceLabel(selected)}**\nใช้กับ /play และ /randommusic เพลงที่อยู่ในคิวแล้วจะเล่นต่อจากแหล่งเดิม และลิงก์ตรงจะใช้แหล่งของลิงก์นั้น`,
      flags: MessageFlags.Ephemeral,
    });
  },
  async play(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    await interaction.deferReply();
    const track = await resolveTrack(
      interaction.options.getString('query', true),
      getMusicSource(interaction.guildId),
    );
    const count = enqueue(interaction.guildId, channel, track);
    return interaction.editReply(
      'เพิ่ม **' +
        track.title +
        '**' +
        (track.duration ? ' (' + duration(track.duration) + ')' : '') +
        ' ในคิวแล้ว · รอ ' +
        count +
        ' เพลง',
    );
  },
  async randommusic(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    await interaction.deferReply();
    const state = await enableRandomMode(interaction.guildId, channel);
    if (!state.randomMode) return interaction.editReply('โหมดสุ่มถูกหยุดแล้ว');
    const playing = state.player.state.status === 'playing' && state.current;
    return interaction.editReply(
      `เปิดโหมดสุ่มเพลงเดี่ยวจาก ${musicSourceLabel(getMusicSource(interaction.guildId))} แล้ว · คละศิลปินและแนวเพลง\n` +
        (playing
          ? `กำลังเล่น **${state.current.title}**`
          : 'กำลังค้นหาเพลงที่เปิดได้ ระบบจะข้ามรายการที่เปิดไม่ได้และลองต่ออัตโนมัติ') +
        '\nเล่นต่อเนื่องจนกด /stop หรือ /leave',
    );
  },
  async queue(interaction) {
    if (!guildOnly(interaction)) return;
    const state = getPlayer(interaction.guildId);
    if (!state || (!state.radio && !state.current && !state.queue.length))
      return interaction.reply('คิวว่างอยู่');
    const playing = state.radio
      ? 'วิทยุสด · ' + state.radio.name
      : (state.current && state.current.title) || 'ไม่มี';
    const lines = [
      'กำลังเล่น: **' + playing + '**',
      ...state.queue.slice(0, 10).map((t, n) => n + 1 + '. ' + t.title),
    ];
    if (state.queue.length > 10) lines.push('และอีก ' + (state.queue.length - 10) + ' เพลง');
    return interaction.reply(lines.join('\n'));
  },
  async skip(interaction) {
    if (!guildOnly(interaction)) return;
    if (getPlayer(interaction.guildId) && getPlayer(interaction.guildId).radio)
      return interaction.reply('กำลังฟังวิทยุ ใช้ /radio play เพื่อเปลี่ยน หรือ /stop เพื่อหยุด');
    return interaction.reply(skip(interaction.guildId) ? 'ข้ามเพลงแล้ว' : 'ไม่มีเพลงที่กำลังเล่น');
  },
  async stop(interaction) {
    if (!guildOnly(interaction)) return;
    stop(interaction.guildId);
    return interaction.reply('หยุดเพลงและล้างคิวแล้ว');
  },
  async pause(interaction) {
    if (!guildOnly(interaction)) return;
    const ok = getPlayer(interaction.guildId) && getPlayer(interaction.guildId).player.pause();
    return interaction.reply(ok ? 'พักเพลงแล้ว' : 'ไม่มีเพลงที่กำลังเล่น');
  },
  async resume(interaction) {
    if (!guildOnly(interaction)) return;
    const ok = getPlayer(interaction.guildId) && getPlayer(interaction.guildId).player.unpause();
    return interaction.reply(ok ? 'เล่นเพลงต่อแล้ว' : 'ไม่มีเพลงที่พักอยู่');
  },
  async nowplaying(interaction) {
    if (!guildOnly(interaction)) return;
    const state = getPlayer(interaction.guildId);
    if (state && state.radio)
      return interaction.reply(
        'กำลังฟังวิทยุสด ' + state.radio.name + ' (' + state.radio.frequency + ' MHz)',
      );
    const track = state && state.current;
    return interaction.reply(
      track
        ? 'กำลังเล่น **' +
            track.title +
            '**' +
            (track.duration ? ' (' + duration(track.duration) + ')' : '')
        : 'ไม่มีเพลงที่กำลังเล่น',
    );
  },
  async leave(interaction) {
    if (!guildOnly(interaction)) return;
    destroyPlayer(interaction.guildId);
    return interaction.reply('ออกจาก voice channel แล้ว');
  },
};
