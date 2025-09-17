export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { ack } from '@/lib/safe';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';
import { getChatHistory } from '@/lib/supabase';

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
        tapPush({ t: nowIso(), route: '/api/chat-history', traceId, note: 'hmac_fail', data: { error: 'invalid signature' } });
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
      console.warn('[WARN] unsigned/invalid signature');
    }

    // Parse JSON safely
    let payload: any;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      tapPush({ t: nowIso(), route: '/api/chat-history', traceId, note: 'json_fail', data: { error: 'invalid json' } });
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    const convId = payload?.conversation?.id;
    if (!convId) {
      tapPush({ t: nowIso(), route: '/api/chat-history', traceId, note: 'no_conv_id', data: { payload } });
      return NextResponse.json({ error: 'missing conversation.id' }, { status: 400 });
    }

    const pageSize = Math.min(payload.pageSize || 5, 20); // Cap at 20
    
    // Get chat history from Supabase
    const events = await getChatHistory(convId, pageSize);
    
    // Convert to n8n expected format
    const messages = events.map(event => ({
      direction: event.type === 'inbound' ? 'inbound' : 'outbound',
      text: event.text || '',
      timestamp: Math.floor(new Date(event.created_at || '').getTime() / 1000)
    })).filter(msg => msg.text); // Only include messages with text

    tapPush({
      t: nowIso(),
      route: '/api/chat-history',
      traceId,
      note: `conv ${convId} history ${messages.length}`,
      data: { convId, messageCount: messages.length }
    });

    console.log('[Desk]', traceId, 'chat-history', 'conv=', convId, 'messages=', messages.length);

    return NextResponse.json(ack({ messages }), { status: 200 });

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-history', traceId, note: 'error', data: { error: String(error) } });
    console.error('[chat-history] Error:', error);
    return NextResponse.json(ack({ messages: [] }), { status: 200 });
  }
}

