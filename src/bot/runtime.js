import { Client, GatewayIntentBits, Events } from 'discord.js';
import { commandHandlers } from '../commands/handlers.js';
import { destroyPlayer } from '../music/player.js';
import { handleCalendarButton } from '../calendar/notifications.js';

let client = null;
let starting = null;
export function getDiscordClient() {
  return client;
}
export function botStatus() {
  return { enabled: !!client, ready: !!client?.isReady(), tag: client?.user?.tag || null };
}
export async function startBot() {
  if (client?.isReady()) return botStatus();
  if (starting) return starting;
  const token = process.env.DISCORD_TOKEN;
  if (!token || token === 'put-your-bot-token-here')
    throw new Error('ยังไม่ได้ตั้งค่า DISCORD_TOKEN');
  starting = (async () => {
    const instance = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });
    client = instance;
    instance.once(Events.ClientReady, (ready) => console.log('Ready as ' + ready.user.tag));
    instance.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isButton()) {
        try {
          await handleCalendarButton(interaction);
        } catch (error) {
          console.error('[calendar] button:', error.message);
        }
        return;
      }
      if (!interaction.isChatInputCommand()) return;
      const handler = commandHandlers[interaction.commandName];
      if (!handler) return;
      try {
        await handler(interaction);
      } catch (error) {
        console.error('/' + interaction.commandName + ' failed:', error);
        const message = 'เกิดข้อผิดพลาดระหว่างทำงาน ลองใหม่อีกครั้งหรือตรวจสอบ log ของบอท';
        if (interaction.deferred || interaction.replied)
          await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
        else await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
      }
    });
    instance.on(Events.Error, (error) => console.error('Discord client error:', error));
    try {
      await instance.login(token);
      return botStatus();
    } catch (error) {
      instance.destroy();
      if (client === instance) client = null;
      throw error;
    }
  })();
  try {
    return await starting;
  } finally {
    starting = null;
  }
}
export async function stopBot() {
  const old = client;
  if (!old) return botStatus();
  for (const guildId of old.guilds.cache.keys()) destroyPlayer(guildId);
  old.destroy();
  if (client === old) client = null;
  return botStatus();
}
