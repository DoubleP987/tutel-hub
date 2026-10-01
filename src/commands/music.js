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

export const musicHandlers = {
  async play(interaction) {
    if (!guildOnly(interaction)) return;
    const channel = interaction.member.voice && interaction.member.voice.channel;
    if (!channel) return interaction.reply({ content: 'เข้าห้อง voice ก่อนนะ', ephemeral: true });
    await interaction.deferReply();
    const track = await resolveTrack(interaction.options.getString('query', true));
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
    enableRandomMode(interaction.guildId, channel);
    return interaction.reply(
      'เปิดโหมดสุ่มเพลงจาก SoundCloud แล้ว เพลงจะเล่นต่อเนื่องจนกด /stop หรือ /leave',
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
