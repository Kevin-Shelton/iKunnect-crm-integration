export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { ack, asArray } from '@/lib/safe';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';
import { addSuggestions } from '@/lib/chatStorage';

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
      tapPush({ t: nowIso(), route: '/api/chat-assist', traceId, note: 'env_missing', data: { error: 'SHARED_HMAC_SECRET missing' } });
      return NextResponse.json({ error: 'SHARED_HMAC_SECRET missing' }, { status: 400 });
    }

    const raw = await req.text();
    const ok = verifyHmac(raw, req.headers.get('x-signature'), getSecret());
    if (!ok) {
      if (process.env.REJECT_UNSIGNED === 'true') {
        tapPush({ t: nowIso(), route: '/api/chat-assist', traceId, note: 'hmac_fail', data: { error: 'invalid signature' } });
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
      console.warn('[WARN] unsigned/invalid signature');
    }

    // Parse JSON safely
    let payload: any;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      tapPush({ t: nowIso(), route: '/api/chat-assist', traceId, note: 'json_fail', data: { error: 'invalid json' } });
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    // Validate conversationId is present
    const convId = payload?.conversation?.id;
    if (!convId) {
      tapPush({ t: nowIso(), route: '/api/chat-assist', traceId, note: 'no_conv_id', data: { payload } });
      return NextResponse.json({ error: 'missing conversation.id' }, { status: 400 });
    }

    // Normalize suggestions array
    const suggestions = asArray(payload.suggestions).map(String);

    // Store suggestions using new storage system
    if (suggestions.length > 0) {
      addSuggestions(convId, suggestions);
    }

    // Push tap after processing
    tapPush({
      t: nowIso(),
      route: '/api/chat-assist',
      traceId,
      note: `conv ${convId} sugg+${suggestions.length}`,
      data: { convId, counts: { suggestions: suggestions.length } }
    });

    // Console log for debugging
    console.log('[Desk]', traceId, 'chat-assist', 'conv=', convId, 'sugg+', suggestions.length);

    // Return safe response
    return NextResponse.json(ack({ suggestions }), { status: 200 });

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-assist', traceId, note: 'error', data: { error: String(error) } });
    console.error('[chat-assist] Error:', error);
    return NextResponse.json(ack({}), { status: 200 });
  }
}

