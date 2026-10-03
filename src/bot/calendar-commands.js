import { commands } from '../commands/definitions.js';
import { listGuildConfigs } from '../calendar/events.js';
import { reminderOptions } from '../calendar/options.js';
import { calendarEnabled } from '../commands/calendar-visibility.js';
import { canRunBot } from '../cluster/state.js';

let timer = null;
let running = false;
const signatures = new Map();
const enabledGuilds = new Set();
export function guildCalendarEnabled(guildId) {
  return enabledGuilds.has(guildId);
}
export async function syncCalendarCommands(client) {
  if (running || !client?.isReady() || !canRunBot()) return;
  running = true;
  try {
    const configs = await listGuildConfigs();
    const definition = commands.find((command) => command.name === 'calendar');
    for (const guild of client.guilds.cache.values()) {
      const config = configs.find((item) => item.guild_id === guild.id);
      const enabled = calendarEnabled(config, reminderOptions(guild.id));
      if (enabled) enabledGuilds.add(guild.id);
      else enabledGuilds.delete(guild.id);
      const signature = JSON.stringify([enabled, enabled ? definition : null]);
      if (signatures.get(guild.id) === signature) continue;
      if (!canRunBot()) return;
      try {
        const registered = await guild.commands.fetch();
        const existing = registered.find((command) => command.name === 'calendar');
        if (enabled) await guild.commands.create(definition);
        else if (existing) await guild.commands.delete(existing.id);
        signatures.set(guild.id, signature);
      } catch (error) {
        console.warn('[calendar commands]', guild.id, error.message);
      }
    }
  } finally {
    running = false;
  }
}
export async function startCalendarCommands(client) {
  stopCalendarCommands();
  // Remove the old global command so disabled guilds cannot see it.
  try {
    const registered = await client.application.commands.fetch();
    const legacy = registered.find((command) => command.name === 'calendar');
    if (legacy && canRunBot()) await client.application.commands.delete(legacy.id);
  } catch (error) {
    console.warn('[calendar commands] global cleanup:', error.message);
  }
  await syncCalendarCommands(client);
  if (!canRunBot()) return;
  timer = setInterval(() => {
    void syncCalendarCommands(client).catch((error) =>
      console.warn('[calendar commands]', error.message),
    );
  }, 30000);
  timer.unref();
}
export function stopCalendarCommands() {
  clearInterval(timer);
  timer = null;
  signatures.clear();
  enabledGuilds.clear();
}
