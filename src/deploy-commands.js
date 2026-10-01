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
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log(`Registered ${commands.length} commands in guild ${GUILD_ID}.`);
} else {
  await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  console.log(
    `Registered ${commands.length} global commands. They are available in every guild where the bot is installed.`,
  );
}
