// /app/api/chat-assist/route.ts
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

  // Validate body has suggestions: string[]
  if (!Array.isArray(payload?.suggestions)) {
    return NextResponse.json({ error: 'missing or invalid suggestions array' }, { status: 400 });
  }

  const suggestions = payload.suggestions as string[];
  if (!suggestions.every(s => typeof s === 'string')) {
    return NextResponse.json({ error: 'all suggestions must be strings' }, { status: 400 });
  }

  // Normalize if messages present
  if (Array.isArray(payload?.messages)) {
    const messages = payload.messages as GhlMessage[];
    payload.messages = normalizeMessages(messages, payload?.conversation?.id ?? null);
  }

  // TODO: Attach suggestions to the active conversation context for the agent UI
  log.debug('[Assist]', { 
    route: req.nextUrl.pathname, 
    contact: payload?.contact, 
    conv: payload?.conversation,
    suggestionsCount: suggestions.length 
  });

  // Always return 200 to keep n8n fast; include minimal ack
  return NextResponse.json({ ok: true, suggestionsCount: suggestions.length });
}

