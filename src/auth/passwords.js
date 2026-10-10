import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

function decode(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64');
}

function encode(value) {
  return Buffer.from(value).toString('base64url');
}

export function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = scryptSync(String(password), salt, 64, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 67108864,
  });
  return 'scrypt$32768$8$1$' + encode(salt) + '$' + encode(derived);
}

export function verifyPassword(password, packed) {
  try {
    const [algo, n, r, p, saltText, hashText] = packed.split('$');

    if (algo !== 'scrypt') {
      return false;
    }

    const expected = decode(hashText);
    const actual = scryptSync(String(password), decode(saltText), expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 67108864,
    });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
