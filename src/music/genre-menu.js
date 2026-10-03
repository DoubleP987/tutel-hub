import { ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { randomGenres } from './genres.js';
import { t } from '../i18n/bot.js';
export function genreMenuRows(userId, messageId) {
  return [randomGenres.slice(0, 13), randomGenres.slice(13)].map((genres, page) =>
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`music:genre:${userId}:${messageId}:${page}`)
        .setPlaceholder(t('เลือกแนวสุ่มเพลง · กลุ่ม {0}', page + 1))
        .addOptions(genres.map((genre) => ({ label: t(genre.label), value: genre.value }))),
    ),
  );
}
