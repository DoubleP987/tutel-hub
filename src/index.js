import 'dotenv/config';
import './bot/logs.js';
import { initializeAccounts } from './auth/accounts.js';
import { setting } from './database/settings.js';
import { startGroupCalendarWorker } from './integrations/calendar/worker.js';
import { calendarConfigured } from './integrations/calendar/client.js';
import { startReminderScheduler } from './integrations/calendar/legacy/service.js';
import { startControlServer } from './web/server.js';
import { getDiscordClient, startBot, stopBot } from './bot/runtime.js';
import { startCalendarPublisher } from './integrations/calendar/legacy/publish.js';
import { clusterEnabled } from './cluster/state.js';
import { startCluster, stopCluster } from './cluster/runtime.js';
import { data } from './database/connection.js';
import { startCommandRelay, stopCommandRelay } from './cluster/jobs.js';

import { separateCalendarBot, getSeparateCalendarClient } from './bot/calendar-runtime.js';

const getCalendarClient = () =>
  separateCalendarBot() ? getSeparateCalendarClient() : getDiscordClient();
await initializeAccounts();
const stopScheduler = calendarConfigured()
  ? startGroupCalendarWorker(getCalendarClient)
  : startReminderScheduler(getCalendarClient);
const stopPublisher = startCalendarPublisher();
const server = await startControlServer();
if (clusterEnabled()) {
  await startCommandRelay();
  await startCluster();
} else if (setting('bot_enabled') !== '0') {
  try {
    await startBot();
  } catch (error) {
    console.error('[bot] failed to start:', error.message);
  }
}
let closing = false;
async function shutdown(signal) {
  if (closing) return;
  closing = true;
  console.log('Received ' + signal + '; shutting down.');
  stopScheduler();
  stopPublisher();
  stopCommandRelay();
  await stopCluster();
  await stopBot();
  await new Promise((resolve) => server.close(resolve));
  await data.close();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
