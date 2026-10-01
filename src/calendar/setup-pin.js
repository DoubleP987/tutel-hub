import { createHash, timingSafeEqual } from 'node:crypto';
const attempts = new Map();
export function checkCalendarSetupPin(value, key) {
  const expected = process.env.CALENDAR_SETUP_PIN;
  if (!expected) return 'ยังไม่ได้ตั้ง PIN สำหรับตั้ง channel แจ้งเตือน';
  const now = Date.now();
  for (const [k, v] of attempts) if (now - v.since >= 60000) attempts.delete(k);
  const entry = attempts.get(key) || { since: now, failed: 0 };
  if (entry.failed >= 5) return 'ใส่ PIN ผิดหลายครั้ง กรุณารอ 1 นาที';
  const hash = (s) => createHash('sha256').update(s).digest();
  if (typeof value !== 'string' || !timingSafeEqual(hash(value), hash(expected))) {
    entry.failed++;
    attempts.set(key, entry);
    return 'PIN ไม่ถูกต้อง';
  }
  attempts.delete(key);
  return null;
}
