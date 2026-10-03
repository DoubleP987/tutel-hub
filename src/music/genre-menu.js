import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { randomGenres } from './genres.js';
import { t } from '../i18n/bot.js';

export function genreMenuRows(userId, messageId) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`music:genre:${userId}:${messageId}:select`)
        .setPlaceholder(t('เลือกแนวสุ่มเพลง'))
        .addOptions(randomGenres.map((genre) => ({ label: t(genre.label), value: genre.value }))),
    ),
  ];
}
