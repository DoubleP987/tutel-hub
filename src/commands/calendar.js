import { calendarConfigured, calendarRequest } from '../integrations/calendar/client.js';
import { guildOnly } from './shared.js';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

/** Temporary shared transport. Calendar owns membership, connection rules and jobs. */
export const calendarHandlers = {
  async calendar(interaction) {
    if (!guildOnly(interaction)) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      if (!calendarConfigured()) throw new Error('ยังไม่ได้เปิดการเชื่อมปฏิทินกลุ่ม');
      const runtime = await calendarRequest('/runtime-info');
      if (runtime.mode !== 'shared')
        throw new Error('ปฏิทินใช้บอทแยกแล้ว ให้ใช้ /calendar ของบอทปฏิทินตัวนั้น');
      const guildId = interaction.guildId;
      if (interaction.options.getSubcommand() === 'connect') {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild))
          throw new Error('เฉพาะผู้ที่มีสิทธิ์จัดการเซิร์ฟเวอร์ Discord');
        const permissions = interaction.channel?.permissionsFor(interaction.client.user);
        if (
          !permissions?.has([
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.EmbedLinks,
          ])
        )
          throw new Error('บอทต้องมีสิทธิ์ดูช่อง ส่งข้อความ และ Embed Links');
        const calendarUrl = interaction.options.getString('calendar');
        if (!calendarUrl)
          throw new Error(
            'ใส่ลิงก์ปฏิทินในช่อง calendar เช่น https://calendar.toomtoom.online/g/cs-skru',
          );
        const result = await calendarRequest('/connect-link', {
          method: 'POST',
          body: {
            calendarUrl,
            discordUserId: interaction.user.id,
            guildId,
            channelId: interaction.channelId,
          },
        });
        return interaction.editReply({
          content: `เชื่อม ${result.groupName} กับช่องนี้แล้ว`,
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setStyle(ButtonStyle.Link)
                .setLabel('เปิดปฏิทิน')
                .setURL(result.url),
            ),
          ],
        });
      }
      const bindings = (await calendarRequest('/bindings'))
        .filter(
          (binding) => binding.guild_id === guildId && binding.channel_id === interaction.channelId,
        )
        .slice(0, 5);
      return interaction.editReply({
        content: bindings.length
          ? 'ดูปฏิทินของกลุ่มผ่านเว็บ'
          : 'ช่องนี้ยังไม่เชื่อมกลุ่ม ให้ผู้ดูแลใช้ /calendar connect',
        components: bindings.length
          ? [
              new ActionRowBuilder().addComponents(
                bindings.map((binding) =>
                  new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('ปฏิทิน ' + binding.slug)
                    .setURL(
                      new URL(
                        '/g/' + binding.slug,
                        process.env.CALENDAR_WEB_URL || process.env.CALENDAR_SERVICE_URL,
                      ).href,
                    ),
                ),
              ),
            ]
          : [],
      });
    } catch (error) {
      return interaction.editReply({ content: error.message });
    }
  },
};
