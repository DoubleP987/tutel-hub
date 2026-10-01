import 'dotenv/config';
import { initializeAccounts, setting } from './calendar/db.js';
import { startReminderScheduler } from './calendar/service.js';
import { startControlServer } from './web/server.js';
import { getDiscordClient, startBot, stopBot } from './bot/runtime.js';
import { startCalendarPublisher } from './calendar/publish.js';

initializeAccounts();
const stopScheduler=startReminderScheduler(getDiscordClient);
const stopPublisher=startCalendarPublisher();
const server=await startControlServer();
if (setting('bot_enabled')!=='0') {
 try { await startBot(); }
 catch(error) { console.error('[bot] failed to start:',error.message); }
}
let closing=false;
async function shutdown(signal) {
 if (closing) return;
 closing=true; console.log('Received '+signal+'; shutting down.');
 stopScheduler(); stopPublisher(); await stopBot(); await new Promise(resolve=>server.close(resolve)); process.exit(0);
}
process.on('SIGINT',()=>void shutdown('SIGINT'));
process.on('SIGTERM',()=>void shutdown('SIGTERM'));
