import { workerData } from 'node:worker_threads';
const clock = new BigInt64Array(workerData.clock);
setInterval(() => {
  const deadline = Atomics.load(clock, 0);
  if (deadline > 0n && process.hrtime.bigint() >= deadline) {
    // Fence the entire process even if its main event loop is blocked.
    process.kill(workerData.pid, 'SIGKILL');
  }
}, 200).unref();
// Keep the worker alive independently of the main thread's event loop.
setInterval(() => {}, 60000);
