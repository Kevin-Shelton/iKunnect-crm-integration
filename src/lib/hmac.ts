// /lib/hmac.ts
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyHmac(body: string, header: string | null | undefined, secret: string): boolean {
  if (!secret) throw new Error('SHARED_HMAC_SECRET not set');
  if (!header) return false;
  const [algo, hex] = header.split('=');
  if (algo !== 'sha256' || !/^[0-9a-f]{64}$/i.test(hex)) return false;

  const expected = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(hex, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

