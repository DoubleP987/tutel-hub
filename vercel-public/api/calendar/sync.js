import { createHash, timingSafeEqual } from 'node:crypto';
import { validateSnapshot, saveSnapshot } from '../../lib/store.js';
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  const secret = process.env.CALENDAR_SYNC_SECRET;
  if (!secret || !(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID))
    return res.status(503).json({ error: 'Calendar sync is not configured.' });
  const provided = String(req.headers.authorization || '');
  const digest = (x) => createHash('sha256').update(x).digest();
  if (!timingSafeEqual(digest(provided), digest('Bearer ' + secret)))
    return res.status(401).json({ error: 'Unauthorized.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json'))
    return res.status(415).json({ error: 'JSON required.' });
  let data;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (Buffer.byteLength(JSON.stringify(body) || '') > 2000000)
      return res.status(413).json({ error: 'Snapshot too large.' });
    data = validateSnapshot(body);
  } catch {
    return res.status(400).json({ error: 'Invalid calendar data.' });
  }
  try {
    const result = await saveSnapshot(data);
    return res.status(result.stale ? 409 : 200).json(result);
  } catch (error) {
    console.error('[calendar] write failed:', error.name);
    return res.status(503).json({ error: 'Unable to store calendar data. Retry later.' });
  }
}
