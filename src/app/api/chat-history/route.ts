// /app/api/chat-history/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { log } from '@/lib/logger';
import { normalizeMessages } from '@/lib/normalize';
import type { MirrorPayload, GhlMessage } from '@/lib/types';

function missingEnv(name: string): never {
  throw new Error(`Missing env: ${name}`);
}

function getSecret(): string {
  const s = process.env.SHARED_HMAC_SECRET;
  if (!s) missingEnv('SHARED_HMAC_SECRET');
  return s;
}

export async function POST(req: NextRequest) {
  const raw = await req.text(); // raw for HMAC
  const ok = verifyHmac(raw, req.headers.get('x-signature'), getSecret());
  if (!ok) {
    if (process.env.REJECT_UNSIGNED === 'true') {
      return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
    }
    // allow but warn
    log.warn('[WARN] unsigned/invalid signature');
  }

  // Parse JSON safely
  let payload: any;
  try { payload = JSON.parse(raw); }
  catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }); }

  // Normalize if messages present
  if (Array.isArray(payload?.messages)) {
    const messages = payload.messages as GhlMessage[];
    payload.messages = normalizeMessages(messages, payload?.conversation?.id ?? null);
  }

  // TODO: emit/broadcast to agent desk or persist (queue, db, etc.)
  log.debug('[History]', { route: req.nextUrl.pathname, contact: payload?.contact, conv: payload?.conversation });

  // Always return 200 to keep n8n fast; include minimal ack
  return NextResponse.json({ ok: true });
}

