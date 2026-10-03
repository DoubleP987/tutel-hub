import { t } from '../i18n/bot.js';
import { genreSuggestions } from '../music/genres.js';

export async function handleMusicAutocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  const suggestions =
    interaction.commandName === 'randommusic' && focused.name === 'genre'
      ? genreSuggestions(focused.value, t)
      : [];
  await interaction.respond(suggestions);
}
