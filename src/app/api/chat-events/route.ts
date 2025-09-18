export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { normalizeMessages } from '@/lib/normalize';
import { ack } from '@/lib/safe';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';
import { insertChatEvent, supabase } from '@/lib/supabase';
import type { GhlMessage, MirrorPayload } from '@/lib/types';

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
    let payload: MirrorPayload | Record<string, unknown>;
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'json_fail', data: { error: 'invalid json' } });
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    // Validate conversationId is present
    const payloadObj = payload as Record<string, unknown>;
    const conversation = payloadObj?.conversation as Record<string, unknown> | undefined;
    const convId = conversation?.id as string;
    if (!convId) {
      tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'no_conv_id', data: { payload } });
      return NextResponse.json({ error: 'missing conversation.id' }, { status: 400 });
    }

    // Handle different event types
    let eventCount = 0;
    
    // Handle messages array (legacy format)
    const mirrorPayload = payload as MirrorPayload;
    if (mirrorPayload.messages && Array.isArray(mirrorPayload.messages)) {
      const rawMessages = mirrorPayload.messages;
      
      // Filter to only GhlMessage objects (those with 'type' property)
      const ghlMessages = rawMessages.filter((msg): msg is GhlMessage => 
        typeof msg === 'object' && msg !== null && 'type' in msg
      );
      
      if (ghlMessages.length > 0) {
        const normalizedMessages = normalizeMessages(ghlMessages, convId);
        
        for (const msg of normalizedMessages) {
          await insertChatEvent({
            conversation_id: convId,
            type: msg.sender === 'contact' ? 'inbound' : 'agent_send',
            message_id: msg.id,
            text: msg.text,
            payload: msg as unknown as Record<string, unknown>
          });
          eventCount++;
        }
      }
    }
    
    // Handle direct event format (new format)
    if (payloadObj.type) {
      await insertChatEvent({
        conversation_id: convId,
        type: payloadObj.type as string,
        message_id: payloadObj.messageId as string,
        text: payloadObj.text as string,
        items: payloadObj.items as unknown[],
        payload: payloadObj
      });
      eventCount++;
      
      // Broadcast to conversation channel
      const channel = `conv:${convId}:public`;
      await supabase
        .channel(channel)
        .send({
          type: 'broadcast',
          event: 'event',
          payload: payloadObj
        });
    }

    // Push tap after processing
    tapPush({
      t: nowIso(),
      route: '/api/chat-events',
      traceId,
      note: `conv ${convId} events+${eventCount}`,
      data: { convId, counts: { events: eventCount } }
    });

    // Console log for debugging
    console.log('[Desk]', traceId, 'chat-events', 'conv=', convId, 'events+', eventCount);

    // Return safe response
    return NextResponse.json(ack({ 
      messageId: payloadObj.messageId as string,
      threadId: convId,
      eventsProcessed: eventCount
    }), { status: 200 });

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'error', data: { error: String(error) } });
    console.error('[chat-events] Error:', error);
    return NextResponse.json(ack({}), { status: 200 });
  }
}

