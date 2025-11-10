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
    let convId = conversation?.id as string;
    
    // If conversation ID is missing or "unknown", generate one from contact info
    if (!convId || convId === 'unknown') {
      const contact = payloadObj?.contact as Record<string, unknown> | undefined;
      const contactId = contact?.id as string;
      const messageId = payloadObj?.messageId as string;
      
      if (contactId && contactId !== 'unknown') {
        convId = `conv_${contactId}`;
      } else if (messageId) {
        // Extract conversation ID from message ID pattern
        const match = messageId.match(/msg_(\d+)/);
        convId = match ? `conv_${match[1]}` : `conv_${Date.now()}`;
      } else {
        convId = `conv_${Date.now()}`;
      }
      
      console.log('[Chat Events] Generated conversation ID:', convId, 'from:', { contactId, messageId });
    }
    
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
    
    // Handle suggestions from n8n Agent Assist
    if (payloadObj.type === 'suggestions' || payloadObj.type === 'agent_assist') {
      const suggestions = (payloadObj.data as any)?.suggestions || (payloadObj as any).suggestions || [];
      
      if (suggestions.length > 0) {
        console.log('[Chat Events] Storing Agent Assist suggestions:', {
          conversationId: convId,
          count: suggestions.length
        });
        
        // Store suggestions using existing chatStorage system
        const { addSuggestions } = await import('@/lib/chatStorage');
        addSuggestions(convId, suggestions);
        
        tapPush({ 
          t: nowIso(), 
          route: '/api/chat-events', 
          traceId, 
          note: `conv ${convId} sugg+${suggestions.length}`, 
          data: { convId, counts: { suggestions: suggestions.length } } 
        });
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
      
      // Extract text from multiple possible fields
      let messageText = (payloadObj.text as string) || '';
      if (!messageText && payloadObj.messageText) {
        messageText = payloadObj.messageText as string;
      }
      if (!messageText && payloadObj.body) {
        messageText = payloadObj.body as string;
      }
      
      console.log('[Chat Events] Extracted text:', messageText, 'from payload fields:', {
        text: payloadObj.text,
        messageText: payloadObj.messageText,
        body: payloadObj.body
      });
        
      await insertChatEvent({
        conversation_id: convId,
        type: validType,
        message_id: (payloadObj.messageId as string) || `evt_${Date.now()}`,
        text: messageText,
        payload: payloadObj
      });
      eventCount++;

      // If this is a customer message from the customer chat interface, trigger n8n workflow
      if ((payloadObj.source === 'customer_chat' || payloadObj.source === 'customer_chat_start') && messageText && validType === 'inbound') {
        try {
          // Use the existing n8n webhook URL (same as ai-draft route)
          const n8nWebhookUrl = 'https://invictusbpo.app.n8n.cloud/webhook';
          
          const n8nPayload = {
              body: messageText,
              text: messageText,
              message: messageText,
              conversation: {
                id: convId
              },
              contact: {
                id: (payloadObj.contact as any)?.id || convId.replace('conv_', 'customer_'),
                name: (payloadObj.contact as any)?.name || `Customer ${convId.slice(-4)}`,
                email: (payloadObj.contact as any)?.email,
                phone: (payloadObj.contact as any)?.phone,
              },
              locationId: process.env.GHL_LOCATION_ID || 'DKs2AdSvw0MGWJYyXwk1',
              channel: 'webchat',
              timestamp: payloadObj.timestamp || new Date().toISOString(),
              source: 'customer_chat_interface'
            };

            // Call n8n /ghl-chat-inbound webhook
            fetch(`${n8nWebhookUrl}/ghl-chat-inbound`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(n8nPayload)
            }).catch(error => {
              console.warn('[Chat Events] n8n webhook failed:', error.message);
            });

            console.log('[Chat Events] Triggered n8n /ghl-chat-inbound for customer message:', messageText.substring(0, 50));
        } catch (error) {
          console.warn('[Chat Events] Failed to trigger n8n webhook:', error);
        }
      }
      */
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

