import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { createHash } from 'node:crypto';
export const PATH = 'calendar/latest.json';
export async function readSnapshot() {
  let metadata;
  try {
    metadata = await head(PATH);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }
  const result = await get(PATH, { access: 'private', useCache: false });
  if (!result) return null;
  return { data: await new Response(result.stream).json(), etag: metadata.etag };
}
export function validateSnapshot(input) {
  if (
    !input ||
    input.schemaVersion !== 1 ||
    !Number.isSafeInteger(input.revision) ||
    input.revision < 1 ||
    input.timezone !== 'Asia/Bangkok' ||
    !Array.isArray(input.events) ||
    input.events.length > 10000
  )
    throw new Error('Invalid calendar snapshot.');
  if (!Number.isFinite(Date.parse(input.generatedAt))) throw new Error('Invalid generation date.');
  for (const field of ['from', 'to'])
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input[field] || '')) throw new Error('Invalid date range.');
  const allowed = [
    'id',
    'title',
    'description',
    'all_day',
    'holiday',
    'publicHoliday',
    'recurrence',
    'starts_at',
    'ends_at',
    'occurrence_at',
    'occurrence_end',
    'systemHoliday',
    'categories',
    'color',
  ];
  const events = input.events.map((event) => {
    if (
      !event ||
      !['number', 'string'].includes(typeof event.id) ||
      typeof event.title !== 'string' ||
      !event.title.trim() ||
      event.title.length > 500 ||
      typeof (event.description ?? '') !== 'string' ||
      (event.description || '').length > 20000
    )
      throw new Error('Invalid event.');
    for (const field of ['starts_at', 'ends_at', 'occurrence_at', 'occurrence_end'])
      if (typeof event[field] !== 'string' || !Number.isFinite(Date.parse(event[field])))
        throw new Error('Invalid event time.');
    if (Date.parse(event.occurrence_end) <= Date.parse(event.occurrence_at))
      throw new Error('Invalid event duration.');
    if (event.color && !/^#[0-9a-f]{6}$/i.test(event.color))
      throw new Error('Invalid event color.');
    if (
      event.categories !== undefined &&
      (!Array.isArray(event.categories) ||
        event.categories.some((x) => typeof x !== 'string' || x.length > 50))
    )
      throw new Error('Invalid event categories.');
    return Object.fromEntries(
      allowed.filter((k) => event[k] !== undefined).map((k) => [k, event[k]]),
    );
  });
  const data = { timezone: 'Asia/Bangkok', from: input.from, to: input.to, events };
  const contentHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  return {
    ...data,
    schemaVersion: 1,
    revision: input.revision,
    generatedAt: input.generatedAt,
    contentHash,
  };
}
export async function saveSnapshot(data) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await readSnapshot();
    if (current && current.data.revision > data.revision)
      return { ok: false, stale: true, revision: current.data.revision };
    if (current && current.data.revision === data.revision) {
      if (current.data.contentHash === data.contentHash)
        return { ok: true, unchanged: true, revision: data.revision };
      return { ok: false, stale: true, revision: current.data.revision };
    }
    try {
      await put(PATH, JSON.stringify(data), {
        access: 'private',
        addRandomSuffix: false,
        contentType: 'application/json',
        cacheControlMaxAge: 60,
        ...(current ? { ifMatch: current.etag, allowOverwrite: true } : { allowOverwrite: false }),
      });
      return { ok: true, revision: data.revision, count: data.events.length };
    } catch (error) {
      if (
        !(
          error instanceof BlobPreconditionFailedError ||
          /already exists/i.test(error.message || '')
        ) ||
        attempt === 2
      )
        throw error;
    }
  }
}
