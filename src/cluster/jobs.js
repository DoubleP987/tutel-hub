import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { data } from '../database/connection.js';
import { canRunBot, clusterEnabled } from './state.js';
import { clusterStatus, nodeId } from './runtime.js';

const routes = [
  /^\/api\/bot(?:\/logs)?$/,
  /^\/api\/control\/music(?:\/source)?$/,
  /^\/api\/guilds(?:\/\d+\/channels)?$/,
  /^\/api\/settings\/discord(?:\/test)?$/,
];
const key = process.env.CLUSTER_CONTROL_SECRET
  ? createHash('sha256').update(process.env.CLUSTER_CONTROL_SECRET).digest()
  : null;
let timer;
let busy = false;

function jobs() {
  return data.database.collection('cluster_jobs');
}

function encrypt(value) {
  if (!key) {
    throw new Error('CLUSTER_CONTROL_SECRET is required');
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    bytes: bytes.toString('base64'),
  };
}

function decrypt(value) {
  const cipher = createDecipheriv('aes-256-gcm', key, Buffer.from(value.iv, 'base64'));
  cipher.setAuthTag(Buffer.from(value.tag, 'base64'));
  return JSON.parse(
    Buffer.concat([cipher.update(Buffer.from(value.bytes, 'base64')), cipher.final()]).toString(
      'utf8',
    ),
  );
}

export async function forwardActiveBot(req, res, next) {
  if (!clusterEnabled() || canRunBot()) {
    return next();
  }

  const path = req.path;

  if (!routes.some((route) => route.test(path))) {
    return next();
  }
  // This middleware is installed after the original auth/admin/CSRF checks.
  const status = await clusterStatus();

  if (!status.botEnabled || !status.activeNode) {
    if (path === '/api/bot/logs') {
      return next();
    }

    if (path === '/api/bot') {
      return res.json({
        status: { enabled: false, ready: false, tag: null },
        configured: status.botEnabled,
        guilds: [],
        music: [],
      });
    }

    return res.status(503).json({ error: 'บอทกำลังสลับเครื่องหรือปิดอยู่ กรุณาลองอีกครั้ง' });
  }

  const id = randomBytes(16).toString('hex');
  await jobs().insertOne({
    _id: id,
    target: status.activeNode,
    state: 'pending',
    executeBefore: new Date(Date.now() + 15000),
    expiresAt: new Date(Date.now() + 60000),
    payload: encrypt({
      path: req.originalUrl,
      method: req.method,
      body: req.body,
      cookie: req.headers.cookie || '',
      csrf: req.get('x-csrf-token') || '',
    }),
  });
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline && !res.destroyed) {
    const job = await jobs().findOne({ _id: id });

    if (job?.state === 'done') {
      const response = decrypt(job.response);
      return res.status(response.status).json(response.body);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  await jobs().updateOne({ _id: id, state: 'pending' }, { $set: { state: 'cancelled' } });
  return res.status(504).json({ error: 'เครื่องที่รันบอทยังไม่ตอบรับ กรุณารีเฟรชก่อนลองอีกครั้ง' });
}

async function processJobs() {
  if (busy || !canRunBot()) {
    return;
  }

  busy = true;

  try {
    for (let count = 0; count < 5 && canRunBot(); count++) {
      const job = await jobs().findOneAndUpdate(
        { target: nodeId, state: 'pending', executeBefore: { $gt: new Date() } },
        { $set: { state: 'running' } },
        { returnDocument: 'after' },
      );

      if (!job) {
        break;
      }

      let response;

      try {
        const request = decrypt(job.payload);
        const path = new URL(request.path, 'http://localhost');

        if (!routes.some((route) => route.test(path.pathname))) {
          throw new Error('Invalid command route');
        }

        if (!canRunBot()) {
          throw new Error('Bot ownership expired');
        }

        const result = await fetch(
          `http://127.0.0.1:${process.env.CONTROL_PORT || 3000}${path.pathname}${path.search}`,
          {
            method: request.method,
            headers: {
              'content-type': 'application/json',
              cookie: request.cookie,
              'x-csrf-token': request.csrf,
            },
            ...(request.method === 'GET' ? {} : { body: JSON.stringify(request.body || {}) }),
            signal: AbortSignal.timeout(10000),
          },
        );
        response = { status: result.status, body: await result.json() };
      } catch {
        response = {
          status: 503,
          body: { error: 'ส่งคำสั่งไปยังบอทไม่สำเร็จ ตรวจสถานะก่อนลองอีกครั้ง' },
        };
      }

      await jobs().updateOne(
        { _id: job._id },
        {
          $set: {
            state: 'done',
            response: encrypt(response),
            expiresAt: new Date(Date.now() + 60000),
          },
          $unset: { payload: '' },
        },
      );
    }
  } catch (error) {
    console.error('[cluster] command relay:', error.name);
  } finally {
    busy = false;
  }
}

export async function startCommandRelay() {
  if (!clusterEnabled()) {
    return;
  }

  if (!key || process.env.CLUSTER_CONTROL_SECRET.length < 32) {
    throw new Error('Set a strong shared CLUSTER_CONTROL_SECRET');
  }

  await jobs().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await jobs().createIndex({ target: 1, state: 1 });
  timer = setInterval(() => void processJobs(), 500);
  timer.unref();
}

export function stopCommandRelay() {
  clearInterval(timer);
}
