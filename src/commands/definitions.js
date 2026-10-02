import { t } from '../i18n/bot.js';
import { SlashCommandBuilder, ChannelType } from 'discord.js';
export const commands = [
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
        .setName('setup')
        .setDescription(t('ตั้ง channel สำหรับแจ้งเตือน'))
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription(t('channel ที่ให้บอทส่งการเตือน'))
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o.setName('pin').setDescription(t('PIN สำหรับตั้ง channel แจ้งเตือน')).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription(t('เพิ่มกิจกรรมลงปฏิทิน'))
        .addStringOption((o) =>
          o.setName('title').setDescription(t('ชื่อกิจกรรม')).setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName('starts')
            .setDescription(t('เวลาไทย รูปแบบ YYYY-MM-DD HH:mm'))
            .setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName('duration')
            .setDescription(t('ระยะเวลาเป็นนาที (เริ่มต้น 60)'))
            .setMinValue(1)
            .setMaxValue(10080),
        )
        .addStringOption((o) =>
          o
            .setName('repeat')
            .setDescription(t('รูปแบบทำซ้ำ'))
            .addChoices(
              { name: t('ไม่ทำซ้ำ'), value: 'none' },
              { name: t('ทุกวัน'), value: 'daily' },
              { name: t('ทุกสัปดาห์'), value: 'weekly' },
              { name: t('ทุกเดือน'), value: 'monthly' },
              { name: t('ทุกปี'), value: 'yearly' },
            ),
        )
        .addStringOption((o) =>
          o.setName('description').setDescription(t('รายละเอียดกิจกรรม')).setMaxLength(500),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription(t('ดูรายการที่จะถึงใน 30 วัน')))
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription(t('ลบกิจกรรมด้วย ID'))
        .addIntegerOption((o) =>
          o
            .setName('id')
            .setDescription(t('ID จากคำสั่ง /calendar list'))
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription(t('ตั้งเวลาส่งสรุปกิจกรรมรายวันของเซิร์ฟเวอร์'))
        .addStringOption((o) =>
          o
            .setName('time')
            .setDescription(t('เวลาไทย HH:mm เช่น 07:00'))
            .setRequired(true)
            .setMinLength(5)
            .setMaxLength(5),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription(t('ส่งข้อความทดสอบไปยัง channel ที่ตั้งไว้')),
    ),
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
    .setDescription(t('สุ่มเพลงจากแหล่งของเซิร์ฟเวอร์ต่อเนื่องจนกว่าจะสั่งหยุด')),
  new SlashCommandBuilder().setName('queue').setDescription(t('แสดงคิวเพลง')),
  new SlashCommandBuilder().setName('skip').setDescription(t('ข้ามเพลงปัจจุบัน')),
  new SlashCommandBuilder().setName('stop').setDescription(t('หยุดเพลงและล้างคิว')),
  new SlashCommandBuilder().setName('pause').setDescription(t('พักเพลง')),
  new SlashCommandBuilder().setName('resume').setDescription(t('เล่นเพลงต่อ')),
  new SlashCommandBuilder().setName('nowplaying').setDescription(t('แสดงเพลงที่กำลังเล่น')),
  new SlashCommandBuilder().setName('leave').setDescription(t('หยุดและออกจาก voice channel')),
].map((command) => command.toJSON());
