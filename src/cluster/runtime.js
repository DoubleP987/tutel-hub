import { Worker } from 'node:worker_threads';
import { data } from '../database/connection.js';
import { refreshSettings } from '../database/settings.js';
import { startBot, stopBot, botStatus } from '../bot/runtime.js';
import { clusterEnabled, canRunBot, setLeaseDeadline } from './state.js';

export const nodeId = process.env.CLUSTER_NODE_ID || 'standalone';
const primary = process.env.CLUSTER_PRIMARY_NODE || 'homeserver';
const nodes = ['homeserver', 'oracle'];
const localLifetime = 6000n * 1000000n;
const serverLifetime = 12000;
let timer,
  watchdog,
  busy = false,
  owned = false,
  closing = false;
const clock = new BigInt64Array(new SharedArrayBuffer(8));
function collection(name) {
  if (data.kind !== 'mongodb') throw new Error('Automatic failover requires MongoDB');
  return data.database.collection(name);
}
async function initialize() {
  if (!nodes.includes(nodeId)) throw new Error('CLUSTER_NODE_ID must be homeserver or oracle');
  await collection('cluster_leases').updateOne(
    { _id: 'bot' },
    { $setOnInsert: { enabled: true, target: 'auto', owner: null, expiresAt: new Date(0) } },
    { upsert: true },
  );
  await collection('cluster_nodes').createIndex({ expiresAt: 1 });
}
export async function clusterStatus() {
  if (!clusterEnabled()) return { enabled: false, node: nodeId };
  const [lease, status] = await Promise.all([
    collection('cluster_leases').findOne({ _id: 'bot' }),
    collection('cluster_nodes').find().project({ _id: 0 }).toArray(),
  ]);
  return {
    enabled: true,
    node: nodeId,
    target: lease.target,
    botEnabled: lease.enabled,
    activeNode: lease.owner,
    expiresAt: lease.expiresAt,
    nodes: status,
    failoverSeconds: 12,
  };
}
export async function setClusterTarget(target, enabled = true) {
  if (!['auto', ...nodes].includes(target)) throw new Error('เลือก auto, homeserver หรือ oracle');
  await collection('cluster_leases').updateOne(
    { _id: 'bot' },
    { $set: { target, enabled: Boolean(enabled) }, $currentDate: { changedAt: true } },
  );
  return clusterStatus();
}
export async function shutdownLocalNode() {
  const next = nodeId === 'homeserver' ? 'oracle' : 'homeserver';
  return setClusterTarget(next, true);
}
async function yieldLease() {
  if (!owned) return;
  setLeaseDeadline(0n);
  // Release is acknowledged only after Discord and voice sockets are closed.
  await stopBot();
  await collection('cluster_leases').updateOne(
    { _id: 'bot', owner: nodeId },
    { $set: { owner: null, expiresAt: new Date(0) } },
  );
  owned = false;
  Atomics.store(clock, 0, 0n);
  setLeaseDeadline(0n);
  console.log('[cluster] released Discord ownership');
}
async function tick() {
  if (busy || closing) return;
  busy = true;
  try {
    const heartbeat = await collection('cluster_nodes').findOneAndUpdate(
      { _id: nodeId },
      [
        {
          $set: {
            node: nodeId,
            status: botStatus().ready ? 'online' : botStatus().enabled ? 'starting' : 'standby',
            now: '$$NOW',
            expiresAt: { $add: ['$$NOW', serverLifetime] },
            musicSource: process.env.MUSIC_SOURCE_OVERRIDE || 'per-guild',
          },
        },
      ],
      { upsert: true, returnDocument: 'after' },
    );
    const [control, primaryState] = await Promise.all([
      collection('cluster_leases').findOne({ _id: 'bot' }),
      collection('cluster_nodes').findOne({ _id: primary }),
    ]);
    const primaryAlive = primaryState && primaryState.expiresAt > heartbeat.now;
    const eligible =
      control.enabled &&
      (control.target === nodeId ||
        (control.target === 'auto' && (nodeId === primary || !primaryAlive)));
    if (!eligible) {
      await yieldLease();
      return;
    }
    const started = process.hrtime.bigint();
    const lease = await collection('cluster_leases').findOneAndUpdate(
      {
        _id: 'bot',
        enabled: true,
        target: control.target,
        $expr: { $or: [{ $lte: ['$expiresAt', '$$NOW'] }, { $eq: ['$owner', nodeId] }] },
      },
      [{ $set: { owner: nodeId, expiresAt: { $add: ['$$NOW', serverLifetime] } } }],
      { returnDocument: 'after' },
    );
    if (!lease) {
      if (owned) await yieldLease();
      return;
    }
    const deadline = started + localLifetime;
    if (process.hrtime.bigint() >= deadline) {
      await yieldLease();
      return;
    }
    owned = true;
    setLeaseDeadline(deadline);
    Atomics.store(clock, 0, deadline);
    await refreshSettings();
    if (!botStatus().enabled && canRunBot()) {
      // Login must not block subsequent lease renewal ticks.
      void startBot().catch((error) =>
        console.error('[cluster] Discord start failed:', error.message),
      );
    }
  } catch (error) {
    console.error('[cluster] renewal unavailable:', error.name);
    // The independent watchdog fences us before another node can acquire the lease.
  } finally {
    busy = false;
  }
}
export async function startCluster() {
  if (!clusterEnabled()) return;
  await initialize();
  watchdog = new Worker(new URL('./watchdog.js', import.meta.url), {
    execArgv: [],
    workerData: { clock: clock.buffer, pid: process.pid },
  });
  watchdog.unref();
  timer = setInterval(() => void tick(), 2000);
  await tick();
}
export async function stopCluster() {
  if (!clusterEnabled()) return;
  closing = true;
  clearInterval(timer);
  await yieldLease();
  await watchdog?.terminate();
}
