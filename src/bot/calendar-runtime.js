import { Client, Events, GatewayIntentBits, ActivityType } from 'discord.js';
import { canRunBot } from '../cluster/state.js';
import { calendarHandlers } from '../commands/calendar.js';
import { handleCalendarButton } from '../integrations/calendar/legacy/notifications.js';
import { startCalendarCommands } from './calendar-commands.js';

let client = null;

export const separateCalendarBot = () => Boolean(process.env.CALENDAR_DISCORD_TOKEN?.trim());

export const getSeparateCalendarClient = () => (canRunBot() ? client : null);

/** A second Discord identity, sharing the host lease and existing calendar service. */
export async function startSeparateCalendarBot() {
  if (!separateCalendarBot() || client) {
    return;
  }

  const token = process.env.CALENDAR_DISCORD_TOKEN.trim();

  if (token === process.env.DISCORD_TOKEN?.trim()) {
    throw new Error('CALENDAR_DISCORD_TOKEN must belong to a different bot');
  }

  const instance = new Client({ intents: [GatewayIntentBits.Guilds] });
  client = instance;

  instance.once(Events.ClientReady, (ready) => {
    ready.user.setPresence({
      status: 'online',
      activities: [{ name: '/calendar', type: ActivityType.Playing }],
    });
    console.log('[calendar bot] ready:', ready.user.tag);
    void startCalendarCommands(ready).catch((error) =>
      console.error('[calendar bot] commands:', error.message),
    );
  });

  instance.on(Events.InteractionCreate, async (interaction) => {
    if (!canRunBot()) {
      return;
    }

    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'calendar') {
        await calendarHandlers.calendar(interaction);
      } else if (interaction.isButton()) {
        await handleCalendarButton(interaction);
      }
    } catch (error) {
      console.error('[calendar bot] interaction failed:', error.name);
      const body = { content: 'ทำคำสั่งปฏิทินไม่สำเร็จ กรุณาลองใหม่', flags: 64 };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(body).catch(() => {});
      } else {
        await interaction.reply(body).catch(() => {});
      }
    }
  });

  instance.on(Events.Error, (error) => console.error('[calendar bot] client:', error.name));

  try {
    await instance.login(token);
  } catch (error) {
    instance.destroy();
    client = null;
    throw error;
  }
}

export function stopSeparateCalendarBot() {
  const old = client;
  client = null;
  old?.destroy();
}
