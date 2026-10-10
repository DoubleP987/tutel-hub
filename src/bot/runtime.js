import { t } from '../i18n/bot.js';
import { Client, GatewayIntentBits, Events, ActivityType } from 'discord.js';
import { botConfig } from '../config/bot.js';
import {
  managePrivateReplies,
  clearPrivateReplies,
  dismissPrivateReplyLater,
  privateMenuExpired,
} from './private-replies.js';
import { canRunBot, requireBotLease } from '../cluster/state.js';
import { commandHandlers } from '../commands/handlers.js';
import { musicHandlers } from '../commands/music.js';
import { handleRadioListButton } from '../commands/radio-list.js';
import { startCalendarCommands, stopCalendarCommands } from './calendar-commands.js';
import { handleMusicAutocomplete } from '../commands/music-autocomplete.js';
import { destroyPlayer, getPlayer, watchEmptyVoice } from '../music/player.js';
import { handleMusicRequestButton } from '../music/requests.js';
import { handleCalendarButton } from '../integrations/calendar/legacy/notifications.js';
import {
  initializeMusicPanels,
  stopMusicPanels,
  handleMusicPanelInteraction,
} from '../music/panel.js';

import {
  separateCalendarBot,
  getSeparateCalendarClient,
  startSeparateCalendarBot,
  stopSeparateCalendarBot,
} from './calendar-runtime.js';

let client = null;
let starting = null;

export function getDiscordClient() {
  return canRunBot() ? client : null;
}

export function getCalendarDiscordClient() {
  return separateCalendarBot() ? getSeparateCalendarClient() : getDiscordClient();
}

export function botStatus() {
  return {
    enabled: !!client,
    ready: !!client?.isReady(),
    tag: client?.user?.tag || null,
    calendar: {
      separate: separateCalendarBot(),
      ready: !!getCalendarDiscordClient()?.isReady(),
      tag: getCalendarDiscordClient()?.user?.tag || null,
    },
  };
}

export async function startBot() {
  requireBotLease();

  if (client?.isReady()) {
    return botStatus();
  }

  if (starting) {
    return starting;
  }

  const token = process.env.DISCORD_TOKEN;

  if (!token || token === 'put-your-bot-token-here') {
    throw new Error(t('ยังไม่ได้ตั้งค่า DISCORD_TOKEN'));
  }

  starting = (async () => {
    const instance = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
    });
    client = instance;

    instance.once(Events.ClientReady, (ready) => {
      ready.user.setPresence({
        status: 'online',
        activities: [{ name: botConfig.statusText, type: ActivityType.Playing }],
      });
      console.log('[bot] presence: ' + botConfig.statusText);
      console.log('Ready as ' + ready.user.tag);

      if (!separateCalendarBot()) {
        void startCalendarCommands(ready).catch((error) =>
          console.error('[calendar commands]', error.message),
        );
      }

      if (separateCalendarBot()) {
        void (async () => {
          const global = await ready.application.commands.fetch();

          for (const command of global.values()) {
            if (command.name === 'calendar') {
              await command.delete();
            }
          }

          for (const guild of ready.guilds.cache.values()) {
            const commands = await guild.commands.fetch();

            for (const command of commands.values()) {
              if (command.name === 'calendar') {
                await command.delete();
              }
            }
          }
        })().catch((error) => console.warn('[calendar bot] music command cleanup:', error.name));
      }

      void initializeMusicPanels(ready).catch((error) =>
        console.error('[music panel] initialize:', error.message),
      );
    });

    instance.on(Events.InteractionCreate, async (interaction) => {
      if (!canRunBot()) {
        return;
      }

      if (interaction.isAutocomplete()) {
        try {
          await handleMusicAutocomplete(interaction);
        } catch (error) {
          console.error('[autocomplete]', error.message);
        }

        return;
      }

      if (privateMenuExpired(interaction)) {
        managePrivateReplies(interaction, { isolated: true });
        await interaction
          .reply({
            content: t('เมนูหมดเวลาแล้ว กรุณาเปิดใหม่จากแผงเพลงหรือคำสั่งเดิม'),
            flags: 64,
          })
          .catch(() => {});
        dismissPrivateReplyLater(interaction);
        return;
      }
      // Page updates must preserve the original private list, not replace it.
      if (interaction.customId?.startsWith('radio:list:')) {
        managePrivateReplies(interaction, { isolated: /:(play|last)$/.test(interaction.customId) });

        try {
          await handleRadioListButton(interaction);
        } catch (error) {
          console.warn('[radio list button]', error.message);
        } finally {
          dismissPrivateReplyLater(interaction);
        }

        return;
      }

      managePrivateReplies(interaction, {
        isolated: /^music:radio:.*:(station|last)$/.test(interaction.customId || ''),
        privateByDefault:
          interaction.isChatInputCommand() &&
          (Object.hasOwn(musicHandlers, interaction.commandName) ||
            interaction.commandName === 'radio'),
      });

      if (
        interaction.isButton() ||
        interaction.isStringSelectMenu() ||
        interaction.isModalSubmit()
      ) {
        try {
          if (
            !(await handleMusicRequestButton(interaction)) &&
            !(await handleMusicPanelInteraction(interaction))
          ) {
            if (!separateCalendarBot()) {
              await handleCalendarButton(interaction);
            }
          }
        } catch (error) {
          console.error('[component] interaction:', error.message);
          const response = { content: t('ทำคำสั่งไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'), flags: 64 };

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({ content: response.content }).catch(() => {});
          } else {
            await interaction.reply(response).catch(() => {});
          }
        } finally {
          if (interaction.customId?.startsWith('music:')) {
            dismissPrivateReplyLater(interaction);
          }
        }

        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      if (separateCalendarBot() && interaction.commandName === 'calendar') {
        await interaction.reply({ content: 'ใช้คำสั่งนี้กับบอทปฏิทินแทนครับ', flags: 64 });
        return;
      }

      const handler = commandHandlers[interaction.commandName];

      if (!handler) {
        return;
      }

      try {
        await handler(interaction);
      } catch (error) {
        console.error('/' + interaction.commandName + ' failed:', error);
        const message = t('เกิดข้อผิดพลาดระหว่างทำงาน ลองใหม่อีกครั้งหรือตรวจสอบ log ของบอท');

        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: message, flags: 64 }).catch(() => {});
        } else {
          await interaction.reply({ content: message, flags: 64 }).catch(() => {});
        }
      } finally {
        if (
          Object.hasOwn(musicHandlers, interaction.commandName) ||
          interaction.commandName === 'radio'
        ) {
          dismissPrivateReplyLater(interaction);
        }
      }
    });

    instance.on(Events.Error, (error) => console.error('Discord client error:', error));

    instance.on(Events.VoiceStateUpdate, (oldState, newState) => {
      if (oldState.id === instance.user?.id && oldState.channelId && !newState.channelId) {
        destroyPlayer(oldState.guild.id);
      }

      const channelId = getPlayer(newState.guild.id)?.connection?.joinConfig.channelId;

      if (channelId) {
        const channel = newState.guild.channels.cache.get(channelId);

        if (channel?.members) {
          watchEmptyVoice(
            newState.guild.id,
            channel.members.filter((member) => !member.user.bot).size,
          );
        }
      }
    });

    try {
      await instance.login(token);
      await startSeparateCalendarBot().catch((error) =>
        console.error('[calendar bot] startup failed:', error.name),
      );
      return botStatus();
    } catch (error) {
      instance.destroy();

      if (client === instance) {
        client = null;
      }

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
  stopCalendarCommands();
  stopSeparateCalendarBot();
  const old = client;

  if (!old) {
    return botStatus();
  }

  for (const guildId of old.guilds.cache.keys()) {
    destroyPlayer(guildId);
  }

  await stopMusicPanels();
  await clearPrivateReplies();
  old.destroy();

  if (client === old) {
    client = null;
  }

  return botStatus();
}
