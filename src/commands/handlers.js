import { calendarHandlers } from './calendar.js';
import { radioHandlers } from './radio.js';
import { musicHandlers } from './music.js';

export const commandHandlers = { ...calendarHandlers, ...radioHandlers, ...musicHandlers };
