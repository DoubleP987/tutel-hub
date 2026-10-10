/** Server-side bridge. Never expose either service key to the browser or Discord. */
export function calendarConfigured(kind = 'bot') {
  return Boolean(
    (kind === 'control' || process.env.CALENDAR_GROUPS_ENABLED === '1') &&
      process.env.CALENDAR_SERVICE_URL &&
      (process.env[kind === 'control' ? 'CALENDAR_CONTROL_SECRET' : 'CALENDAR_BOT_SECRET'] || '')
        .length >= 32,
  );
}

export async function calendarRequest(path, { kind = 'bot', method = 'GET', body, actor } = {}) {
  if (!calendarConfigured(kind)) throw new Error('ยังไม่ได้ตั้งการเชื่อม Tutel Calendar');
  const base = new URL(process.env.CALENDAR_SERVICE_URL);
  if (
    base.protocol !== 'https:' &&
    !(base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname))
  )
    throw new Error('Calendar API ต้องเป็น HTTPS หรือ loopback');
  if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Invalid service path');
  const url = new URL(`/internal/v1/${kind === 'control' ? 'control' : 'bot'}${path}`, base);
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${process.env[kind === 'control' ? 'CALENDAR_CONTROL_SECRET' : 'CALENDAR_BOT_SECRET']}`,
      'Content-Type': 'application/json',
      ...(actor ? { 'x-calendar-actor': String(actor).slice(0, 100) } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });
  const value = await response
    .json()
    .catch(() => ({ error: 'Calendar service response unavailable' }));
  if (!response.ok) {
    const error = new Error(value.error || 'Calendar service unavailable');
    error.status = response.status;
    throw error;
  }
  return value;
}
