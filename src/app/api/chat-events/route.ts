import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { ack } from '@/lib/safe';
import { normalizeMessages } from '@/lib/normalize';
import { nowIso, pickTrace } from '@/lib/trace';
import { tapPush } from '@/lib/ring';
import { insertChatEvent } from '@/lib/supabase';
import type { GhlMessage, MirrorPayload } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const traceId = pickTrace(request.headers);
  
  try {
    const body = await request.text();
    const payload = JSON.parse(body);
    
    // HMAC verification
    const signature = request.headers.get('x-signature');
    if (process.env.REJECT_UNSIGNED === 'true' && signature) {
      const isValid = verifyHmac(body, signature, process.env.SHARED_HMAC_SECRET || '');
      if (!isValid) {
        tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'hmac_fail', data: { signature } });
        return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
      }
    }

    tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'received', data: { payload } });

    // Extract conversation ID with proper type handling
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
      const eventType = payloadObj.type as string;
      // Map event types to valid chat event types with proper type checking
      const validEventTypes = ['inbound', 'agent_send', 'suggestions', 'admin'] as const;
      type ValidEventType = typeof validEventTypes[number];
      
      const validType: ValidEventType = validEventTypes.includes(eventType as ValidEventType) 
        ? (eventType as ValidEventType)
        : 'inbound';
        
      await insertChatEvent({
        conversation_id: convId,
        type: validType,
        message_id: (payloadObj.messageId as string) || `evt_${Date.now()}`,
        text: (payloadObj.text as string) || '',
        payload: payloadObj
      });
      eventCount++;
    }

    tapPush({ 
      t: nowIso(), 
      route: '/api/chat-events', 
      traceId, 
      note: `conv ${convId} msg+${eventCount}`, 
      data: { convId, counts: { messages: eventCount } } 
    });

    return NextResponse.json(ack({ 
      received: eventCount,
      conversationId: convId,
      traceId 
    }));

  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/chat-events', traceId, note: 'error', data: { error: String(error) } });
    return NextResponse.json({ error: 'processing failed' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    endpoint: '/api/chat-events',
    methods: ['POST'],
    timestamp: nowIso()
  });
}

