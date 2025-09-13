export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { ack, asArray } from '@/lib/safe';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';

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
    const raw = await req.text();
    const ok = verifyHmac(raw, req.headers.get('x-signature'), getSecret());
    if (!ok) {
      if (process.env.REJECT_UNSIGNED === 'true') {
        tapPush({ t: nowIso(), route: '/api/chat-admin', traceId, note: 'hmac_fail', data: { error: 'invalid signature' } });
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
      console.warn('[WARN] unsigned/invalid signature');
    }

    // Parse JSON safely
    let payload: any;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      tapPush({ t: nowIso(), route: '/api/chat-admin', traceId, note: 'json_fail', data: { error: 'invalid json' } });
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    const convId = payload?.conversation?.id;
    const action = payload?.action;
    const agentId = payload?.agentId;

    // Normalize arrays
    const messages = asArray(payload.messages);
    const suggestions = asArray(payload.suggestions);

    // Push tap after processing
    tapPush({
      t: nowIso(),
      route: '/api/chat-admin',
      traceId,
      note: `conv ${convId} admin ${action}`,
      data: { 
        convId, 
        action, 
        agentId,
        counts: { messages: messages.length, suggestions: suggestions.length } 
      }
    });

    console.log('[Desk]', traceId, 'chat-admin', 'conv=', convId, 'action=', action, 'agent=', agentId);

    return NextResponse.json(ack({ messages, suggestions }), { status: 200 });

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-admin', traceId, note: 'error', data: { error: String(error) } });
    console.error('[chat-admin] Error:', error);
    return NextResponse.json(ack({}), { status: 200 });
  }
}

