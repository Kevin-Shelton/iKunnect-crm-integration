// /app/api/chat-assist/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { log } from '@/lib/logger';
import { safeMirrorAck, asArray } from '@/lib/safe';
import { DeskAckSchema } from '@/lib/schemas';
import type { MirrorPayload } from '@/lib/types';

function getSecret(): string {
  const s = process.env.SHARED_HMAC_SECRET;
  if (!s) {
    log.warn('SHARED_HMAC_SECRET missing, using fallback');
    return 'your_shared_hmac_secret_here_change_this_in_production';
  }
  return s;
}

export async function POST(req: NextRequest) {
  try {
    // Environment check
    if (!process.env.SHARED_HMAC_SECRET) {
      return NextResponse.json({ error: 'SHARED_HMAC_SECRET missing' }, { status: 400 });
    }

    const raw = await req.text();
    const ok = verifyHmac(raw, req.headers.get('x-signature'), getSecret());
    if (!ok) {
      if (process.env.REJECT_UNSIGNED === 'true') {
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
      log.warn('[WARN] unsigned/invalid signature');
    }

    // Parse JSON safely
    let payload: any;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    // Normalize suggestions array
    payload.suggestions = asArray(payload.suggestions).map(String);

    // Structured logging
    log.debug('[desk-ack]', {
      route: req.nextUrl.pathname,
      c: payload?.conversation?.id,
      cnt: { m: (payload.messages ?? []).length, s: (payload.suggestions ?? []).length },
    });

    // Always return safe response structure
    const safeResponse = safeMirrorAck(payload);
    const validatedResponse = DeskAckSchema.parse(safeResponse);
    
    return NextResponse.json(validatedResponse, { status: 200 });

  } catch (error) {
    log.warn('[chat-assist] Error:', error);
    // Return safe error response
    const errorResponse = safeMirrorAck({});
    return NextResponse.json(errorResponse, { status: 200 });
  }
}

