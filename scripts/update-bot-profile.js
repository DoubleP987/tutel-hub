import 'dotenv/config';
import { REST } from 'discord.js';
import { botProfileDescription } from '../src/config/profile.js';

if (!process.env.DISCORD_TOKEN) {
  throw new Error('DISCORD_TOKEN is required.');
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
const description = botProfileDescription();
const updated = await rest.patch('/applications/@me', { body: { description } });

if (updated.description !== description) {
  throw new Error('Discord did not save the description.');
}

console.log('Discord application description updated; avatar and banner unchanged.');
