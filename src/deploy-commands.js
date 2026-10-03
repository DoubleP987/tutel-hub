import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands/definitions.js';
const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;
const guildOnly = process.argv.includes('--guild');
if (
  !DISCORD_TOKEN ||
  DISCORD_TOKEN === 'put-your-bot-token-here' ||
  !CLIENT_ID ||
  CLIENT_ID === 'put-your-application-client-id-here' ||
  (guildOnly && (!GUILD_ID || GUILD_ID === 'put-a-test-server-id-here'))
) {
  console.error(
    `Set DISCORD_TOKEN and CLIENT_ID in .env${guildOnly ? ', plus GUILD_ID for guild-only registration' : ''}.`,
  );
  process.exit(1);
}
const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
if (guildOnly) {
  const { listGuildConfigs } = await import('./calendar/events.js');
  const { reminderOptions } = await import('./calendar/options.js');
  const { calendarEnabled } = await import('./commands/calendar-visibility.js');
  const config = (await listGuildConfigs()).find((item) => item.guild_id === GUILD_ID);
  const body = commands.filter(
    (command) => command.name !== 'calendar' || calendarEnabled(config, reminderOptions(GUILD_ID)),
  );
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body });
  console.log(`Registered ${commands.length} commands in guild ${GUILD_ID}.`);
} else {
  const globalCommands = commands.filter((command) => command.name !== 'calendar');
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: globalCommands });
  console.log(
    `Registered ${globalCommands.length} global commands. Calendar commands are managed per enabled guild by the running bot.`,
  );
}
