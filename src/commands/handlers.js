import { help } from './help.js';
import { calendarHandlers } from './calendar.js';
import { radioHandlers } from './radio.js';
import { musicHandlers } from './music.js';
import { bot } from './bot.js';

export const commandHandlers = {
  bot,
  help,
  ...calendarHandlers,
  ...radioHandlers,
  ...musicHandlers,
};
