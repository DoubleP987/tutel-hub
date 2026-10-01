import { SlashCommandBuilder, ChannelType } from 'discord.js';
export const commands = [
  new SlashCommandBuilder()
    .setName('calendar')
    .setDescription('ปฏิทินและการแจ้งเตือน Tutel')
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('ตั้ง channel สำหรับแจ้งเตือน')
        .addChannelOption((o) =>
          o
            .setName('channel')
            .setDescription('channel ที่ให้บอทส่งการเตือน')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        )
        .addStringOption((o) =>
          o.setName('pin').setDescription('PIN สำหรับตั้ง channel แจ้งเตือน').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('เพิ่มกิจกรรมลงปฏิทิน')
        .addStringOption((o) => o.setName('title').setDescription('ชื่อกิจกรรม').setRequired(true))
        .addStringOption((o) =>
          o.setName('starts').setDescription('เวลาไทย รูปแบบ YYYY-MM-DD HH:mm').setRequired(true),
        )
        .addIntegerOption((o) =>
          o
            .setName('duration')
            .setDescription('ระยะเวลาเป็นนาที (เริ่มต้น 60)')
            .setMinValue(1)
            .setMaxValue(10080),
        )
        .addIntegerOption((o) =>
          o
            .setName('reminder')
            .setDescription('เตือนก่อนกี่นาที (ค่าเริ่มต้น 15)')
            .setMinValue(0)
            .setMaxValue(10080),
        )
        .addStringOption((o) =>
          o
            .setName('repeat')
            .setDescription('รูปแบบทำซ้ำ')
            .addChoices(
              { name: 'ไม่ทำซ้ำ', value: 'none' },
              { name: 'ทุกวัน', value: 'daily' },
              { name: 'ทุกสัปดาห์', value: 'weekly' },
              { name: 'ทุกเดือน', value: 'monthly' },
              { name: 'ทุกปี', value: 'yearly' },
            ),
        )
        .addStringOption((o) =>
          o.setName('description').setDescription('รายละเอียดกิจกรรม').setMaxLength(500),
        ),
    )
    .addSubcommand((sub) => sub.setName('list').setDescription('ดูรายการที่จะถึงใน 30 วัน'))
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('ลบกิจกรรมด้วย ID')
        .addIntegerOption((o) =>
          o
            .setName('id')
            .setDescription('ID จากคำสั่ง /calendar list')
            .setRequired(true)
            .setMinValue(1),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('config')
        .setDescription('ตั้งค่าเตือนล่วงหน้าของ server')
        .addIntegerOption((o) =>
          o
            .setName('reminder')
            .setDescription('นาทีก่อนถึงเวลา')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(10080),
        ),
    )
    .addSubcommand((sub) =>
      sub.setName('test').setDescription('ส่งข้อความทดสอบไปยัง channel ที่ตั้งไว้'),
    ),
  new SlashCommandBuilder()
    .setName('play')
    .setDescription('ค้นหาเพลงหรือใส่ URL')
    .addStringOption((o) =>
      o.setName('query').setDescription('ชื่อเพลงหรือ URL').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('radio')
    .setDescription('ฟังวิทยุสด')
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('ดูสถานีที่เปิดได้')
        .addStringOption((o) =>
          o
            .setName('area')
            .setDescription('เลือกภาค')
            .addChoices(
              { name: 'กรุงเทพฯ', value: 'bangkok' },
              { name: 'ภาคเหนือ', value: 'north' },
              { name: 'ภาคกลาง', value: 'central' },
              { name: 'ภาคตะวันออก', value: 'east' },
              { name: 'ภาคตะวันออกเฉียงเหนือ', value: 'northeast' },
              { name: 'ภาคตะวันตก', value: 'west' },
              { name: 'ภาคใต้', value: 'south' },
              { name: 'หาดใหญ่/สงขลา', value: 'hatyai' },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('play')
        .setDescription('เปิดสถานีตามภาคและความถี่/ชื่อ')
        .addStringOption((o) =>
          o.setName('station').setDescription('ความถี่หรือชื่อสถานี เช่น 107.75').setRequired(true),
        )
        .addStringOption((o) =>
          o
            .setName('area')
            .setDescription('เลือกภาคของคลื่นนี้')
            .addChoices(
              { name: 'กรุงเทพฯ', value: 'bangkok' },
              { name: 'ภาคเหนือ', value: 'north' },
              { name: 'ภาคกลาง', value: 'central' },
              { name: 'ภาคตะวันออก', value: 'east' },
              { name: 'ภาคตะวันออกเฉียงเหนือ', value: 'northeast' },
              { name: 'ภาคตะวันตก', value: 'west' },
              { name: 'ภาคใต้', value: 'south' },
              { name: 'หาดใหญ่/สงขลา', value: 'hatyai' },
            ),
        ),
    ),
  new SlashCommandBuilder()
    .setName('randommusic')
    .setDescription('สุ่มเพลงจาก SoundCloud ต่อเนื่องจนกว่าจะสั่งหยุด'),
  new SlashCommandBuilder().setName('queue').setDescription('แสดงคิวเพลง'),
  new SlashCommandBuilder().setName('skip').setDescription('ข้ามเพลงปัจจุบัน'),
  new SlashCommandBuilder().setName('stop').setDescription('หยุดเพลงและล้างคิว'),
  new SlashCommandBuilder().setName('pause').setDescription('พักเพลง'),
  new SlashCommandBuilder().setName('resume').setDescription('เล่นเพลงต่อ'),
  new SlashCommandBuilder().setName('nowplaying').setDescription('แสดงเพลงที่กำลังเล่น'),
  new SlashCommandBuilder().setName('leave').setDescription('หยุดและออกจาก voice channel'),
].map((command) => command.toJSON());
