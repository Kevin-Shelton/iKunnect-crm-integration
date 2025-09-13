export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { normalizeMessages } from '@/lib/normalize';
import { ack, asArray } from '@/lib/safe';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';
import { upsertMessages } from '@/lib/chatStorage';
import type { GhlMessage, NormalizedMessage } from '@/lib/types';

function getSecret(): string {
  const s = process.env.SHARED_HMAC_SECRET;
  if (!s) {
    console.warn('SHARED_HMAC_SECRET missing, using fallback');
    return 'your_shared_hmac_secret_here_change_this_in_production';
  }
  return s;
}

export async function POST(req: NextRequest) {
  const traceId = pickTrace(req.headers);
  
  try {
    // Environment check
    if (!process.env.SHARED_HMAC_SECRET) {
      tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'env_missing', data: { error: 'SHARED_HMAC_SECRET missing' } });
      return NextResponse.json({ error: 'SHARED_HMAC_SECRET missing' }, { status: 400 });
    }

    const raw = await req.text();
    const ok = verifyHmac(raw, req.headers.get('x-signature'), getSecret());
    if (!ok) {
      if (process.env.REJECT_UNSIGNED === 'true') {
        tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'hmac_fail', data: { error: 'invalid signature' } });
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
      console.warn('[WARN] unsigned/invalid signature');
    }

    // Parse JSON safely
    let payload: any;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'json_fail', data: { error: 'invalid json' } });
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    // Validate conversationId is present
    const convId = payload?.conversation?.id;
    if (!convId) {
      tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'no_conv_id', data: { payload } });
      return NextResponse.json({ error: 'missing conversation.id' }, { status: 400 });
    }

    // Normalize inbound payloads
    const rawMessages = asArray(payload.messages);
    let normalizedMessages: NormalizedMessage[] = [];
    
    if (rawMessages.length > 0) {
      normalizedMessages = normalizeMessages(rawMessages as GhlMessage[], convId);
    }

    // Store messages using new storage system
    if (normalizedMessages.length > 0) {
      upsertMessages(convId, normalizedMessages);
    }

    // Push tap after processing
    tapPush({
      t: nowIso(),
      route: '/api/chat-events',
      traceId,
      note: `conv ${convId} msg+${normalizedMessages.length}`,
      data: { convId, counts: { messages: normalizedMessages.length } }
    });

    // Console log for debugging
    console.log('[Desk]', traceId, 'chat-events', 'conv=', convId, 'msg+', normalizedMessages.length);

    // Return safe response
    return NextResponse.json(ack({ messages: normalizedMessages }), { status: 200 });

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'error', data: { error: String(error) } });
    console.error('[chat-events] Error:', error);
    return NextResponse.json(ack({}), { status: 200 });
  }
}

