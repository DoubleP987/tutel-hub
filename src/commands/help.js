import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { botWebsite, botConfig } from '../config/bot.js';
import { t } from '../i18n/bot.js';

export function helpReply() {
  const website = new URL(botWebsite);

  if (!['https:', 'http:'].includes(website.protocol)) {
    throw new Error('BOT_WEBSITE_URL must be an HTTP(S) URL.');
  }

  const guide = new URL(
    'guide.html',
    website.href.endsWith('/') ? website.href : website.href + '/',
  );
  return {
    flags: MessageFlags.Ephemeral,
    embeds: [
      new EmbedBuilder()
        .setColor(0x215c43)
        .setTitle(t('🐢 คู่มือ Tutel'))
        .setDescription(t('กดปุ่มด้านล่างเพื่อเปิดเว็บและคู่มือการใช้งาน ข้อความนี้เห็นเฉพาะคุณ'))
        .setFooter({ text: 'Tutel · by Double_P' }),
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel(t('🌐 เปิดเว็บไซต์'))
          .setStyle(ButtonStyle.Link)
          .setURL(website.href),
        new ButtonBuilder().setLabel(t('📖 คู่มือ')).setStyle(ButtonStyle.Link).setURL(guide.href),
        new ButtonBuilder()
          .setLabel('GitHub')
          .setStyle(ButtonStyle.Link)
          .setURL(botConfig.repository),
      ),
    ],
    allowedMentions: { parse: [] },
  };
}

export async function help(interaction) {
  return interaction.reply(helpReply());
}
