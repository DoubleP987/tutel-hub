import { t } from '../i18n/bot.js';
import { SlashCommandBuilder, ChannelType } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('join')
    .setDescription(t('เข้าห้องเสียงมารอ · ออกเมื่อไม่มีเพลง 5 นาที')),
  new SlashCommandBuilder()
    .setName('help')
    .setDescription(t('เปิดเว็บและคู่มือ Tutel แบบเห็นเฉพาะคุณ')),
  new SlashCommandBuilder()
    .setName('bot')
    .setDescription(t('สถานะและสลับเครื่องที่รัน Tutel (เจ้าของบอท)'))
    .addSubcommand((sub) => sub.setName('status').setDescription(t('ดูเครื่องที่กำลังทำงาน')))
    .addSubcommand((sub) =>
      sub.setName('shutdown').setDescription(t('ปิดบอทเครื่องนี้และส่งต่อให้อีกเครื่อง')),
    )
    .addSubcommand((sub) =>
      sub
        .setName('switch')
        .setDescription(t('เลือกเครื่องที่รันบอท'))
        .addStringOption((option) =>
          option
            .setName('target')
            .setDescription(t('เครื่องหรือโหมดอัตโนมัติ'))
            .setRequired(true)
            .addChoices(
              { name: t('อัตโนมัติ'), value: 'auto' },
              { name: 'homeserver', value: 'homeserver' },
              { name: 'Oracle', value: 'oracle' },
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName('music')
    .setDescription(t('ดูหรือเปลี่ยนแหล่งค้นหาเพลงของเซิร์ฟเวอร์'))
    .addSubcommand((sub) =>
      sub
        .setName('settings')
        .setDescription(t('ตั้งแหล่งเพลงแยกแต่ละเซิร์ฟเวอร์ (เริ่มต้น YouTube)'))
        .addStringOption((option) =>
          option
            .setName('source')
            .setDescription(t('แหล่งค้นหาเพลง ใช้สิทธิ์จัดการเซิร์ฟเวอร์เพื่อเปลี่ยน'))
            .addChoices(
              { name: 'YouTube', value: 'youtube' },
              { name: 'SoundCloud', value: 'soundcloud' },
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName('calendar')
    .setDescription(t('ปฏิทินและการแจ้งเตือน Tutel'))
    .addSubcommand((sub) =>
      sub
        .setName('connect')
        .setDescription('เชื่อมช่องนี้กับปฏิทินด้วยลิงก์')
        .addStringOption((option) =>
          option
            .setName('calendar')
            .setDescription('ลิงก์ปฏิทิน เช่น https://calendar.toomtoom.online/g/cs-skru')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('view').setDescription('เปิดปฏิทินที่เชื่อมช่องนี้')),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription(t('ค้นหาเพลงหรือใส่ URL'))
    .addStringOption((o) =>
      o.setName('query').setDescription(t('ชื่อเพลงหรือ URL')).setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('radio')
    .setDescription(t('ฟังวิทยุสด'))
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription(t('ดูสถานีที่เปิดได้'))
        .addStringOption((o) =>
          o
            .setName('area')
            .setDescription(t('เลือกภาค'))
            .addChoices(
              { name: t('กรุงเทพฯ'), value: 'bangkok' },
              { name: t('ภาคเหนือ'), value: 'north' },
              { name: t('ภาคกลาง'), value: 'central' },
              { name: t('ภาคตะวันออก'), value: 'east' },
              { name: t('ภาคตะวันออกเฉียงเหนือ'), value: 'northeast' },
              { name: t('ภาคตะวันตก'), value: 'west' },
              { name: t('ภาคใต้'), value: 'south' },
              { name: t('หาดใหญ่/สงขลา'), value: 'hatyai' },
            ),
        )
        .addStringOption((o) =>
          o
            .setName('category')
            .setDescription(t('หมวดสถานี'))
            .addChoices(
              { name: t('เพลง'), value: 'music' },
              { name: t('ข่าวและจราจร'), value: 'news' },
              { name: t('สาระและการศึกษา'), value: 'talk' },
              { name: t('กีฬา'), value: 'sport' },
              { name: t('ท้องถิ่น'), value: 'local' },
            ),
        )
        .addIntegerOption((o) =>
          o.setName('page').setDescription(t('หน้ารายการสถานี')).setMinValue(1).setMaxValue(100),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription(t('เปิดสถานีตามภาคและความถี่/ชื่อ'))
        .addStringOption((o) =>
          o
            .setName('station')
            .setDescription(t('ความถี่หรือชื่อสถานี เช่น 107.75'))
            .setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName('area')
            .setDescription(t('เลือกภาคของคลื่นนี้'))
            .addChoices(
              { name: t('กรุงเทพฯ'), value: 'bangkok' },
              { name: t('ภาคเหนือ'), value: 'north' },
              { name: t('ภาคกลาง'), value: 'central' },
              { name: t('ภาคตะวันออก'), value: 'east' },
              { name: t('ภาคตะวันออกเฉียงเหนือ'), value: 'northeast' },
              { name: t('ภาคตะวันตก'), value: 'west' },
              { name: t('ภาคใต้'), value: 'south' },
              { name: t('หาดใหญ่/สงขลา'), value: 'hatyai' },
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName('randommusic')
    .setDescription(t('สุ่มเพลงจากแหล่งของเซิร์ฟเวอร์ต่อเนื่องจนกว่าจะสั่งหยุด'))
    .addStringOption((option) =>
      option
        .setName('genre')
        .setDescription(t('แนวเพลง · จำค่าแยกแต่ละเซิร์ฟเวอร์'))
        .setAutocomplete(true),
    ),
  new SlashCommandBuilder().setName('queue').setDescription(t('แสดงคิวเพลง')),
  new SlashCommandBuilder()
    .setName('playnext')
    .setDescription(t('เพิ่มเพลงหรือ Playlist ต่อจากเพลงปัจจุบัน'))
    .addStringOption((o) =>
      o.setName('query').setDescription(t('ชื่อเพลงหรือ URL')).setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('remove')
    .setDescription(t('ลบเพลงที่รอจากคิว'))
    .addIntegerOption((o) =>
      o
        .setName('position')
        .setDescription(t('ลำดับในคิวจาก /queue'))
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500),
    ),
  new SlashCommandBuilder()
    .setName('move')
    .setDescription(t('ย้ายลำดับเพลงที่รอในคิว'))
    .addIntegerOption((o) =>
      o
        .setName('position')
        .setDescription(t('ลำดับในคิวจาก /queue'))
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500),
    )
    .addIntegerOption((o) =>
      o
        .setName('to')
        .setDescription(t('ลำดับใหม่'))
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(500),
    ),
  new SlashCommandBuilder()
    .setName('clearqueue')
    .setDescription(t('ล้างเพลงที่รอ โดยไม่หยุดเพลงปัจจุบัน')),
  new SlashCommandBuilder().setName('shuffle').setDescription(t('สุ่มลำดับเพลงที่รอในคิว')),
  new SlashCommandBuilder()
    .setName('loop')
    .setDescription(t('ตั้งโหมดวนเพลงหรือวนทั้งคิว'))
    .addStringOption((o) =>
      o
        .setName('mode')
        .setDescription(t('โหมดวนซ้ำ'))
        .setRequired(true)
        .addChoices(
          { name: t('ปิด'), value: 'off' },
          { name: t('เพลงเดียว'), value: 'track' },
          { name: t('ทั้งคิว'), value: 'queue' },
        ),
    ),
  new SlashCommandBuilder().setName('skip').setDescription(t('ข้ามเพลงปัจจุบัน')),
  new SlashCommandBuilder().setName('stop').setDescription(t('หยุดเพลงและล้างคิว')),
  new SlashCommandBuilder().setName('pause').setDescription(t('พักเพลง')),
  new SlashCommandBuilder().setName('resume').setDescription(t('เล่นเพลงต่อ')),
  new SlashCommandBuilder().setName('nowplaying').setDescription(t('แสดงเพลงที่กำลังเล่น')),
  new SlashCommandBuilder().setName('leave').setDescription(t('หยุดและออกจาก voice channel')),
].map((command) => command.toJSON());
