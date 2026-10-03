import 'dotenv/config';
import './bot/logs.js';
import { initializeAccounts, setting } from './calendar/db.js';
import { startReminderScheduler } from './calendar/service.js';
import { startControlServer } from './web/server.js';
import { getDiscordClient, startBot, stopBot } from './bot/runtime.js';
import { startCalendarPublisher } from './calendar/publish.js';
import { clusterEnabled } from './cluster/state.js';
import { startCluster, stopCluster } from './cluster/runtime.js';
import { data } from './database/connection.js';
import { startCommandRelay, stopCommandRelay } from './cluster/jobs.js';

await initializeAccounts();
const stopScheduler = startReminderScheduler(getDiscordClient);
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
