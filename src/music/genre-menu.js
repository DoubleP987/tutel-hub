import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { randomGenres } from './genres.js';
import { t } from '../i18n/bot.js';

export function genreMenuRows(userId, messageId, { enabled = false, genre: selectedGenre } = {}) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`music:genre:${userId}:${messageId}:select`)
        .setPlaceholder(t('เลือกแนวสุ่มเพลง'))
        .addOptions(
          randomGenres.map((genre) => ({
            label: t(genre.label),
            value: genre.value,
            default: selectedGenre === genre.value,
          })),
        ),
    ),
    ...(enabled
      ? [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`music:genre:${userId}:${messageId}:off`)
              .setLabel(t('🔀 ปิดสุ่ม'))
              .setStyle(ButtonStyle.Secondary),
          ),
        ]
      : []),
  ];
}
