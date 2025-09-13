// /app/api/chat-events/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { log } from '@/lib/logger';
import { normalizeMessages } from '@/lib/normalize';
import { safeMirrorAck, asArray } from '@/lib/safe';
import { DeskAckSchema } from '@/lib/schemas';
import type { MirrorPayload, GhlMessage, NormalizedMessage } from '@/lib/types';
import { ChatEventStorage } from '@/lib/storage';

function missingEnv(name: string): never {
  throw new Error(`Missing env: ${name}`);
}

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
    try { 
      payload = JSON.parse(raw); 
    } catch { 
      return NextResponse.json({ error: 'invalid json' }, { status: 400 }); 
    }

    // Normalize inbound payloads
    const rawMessages = asArray(payload.messages);
    let normalizedMessages: NormalizedMessage[] = [];
    
    if (rawMessages.length > 0) {
      normalizedMessages = normalizeMessages(rawMessages as GhlMessage[], payload?.conversation?.id ?? null);
    }

    // Update payload with normalized messages
    payload.messages = normalizedMessages;

    // Persist to storage system
    if (normalizedMessages.length > 0) {
      for (const message of normalizedMessages) {
        if (message.conversationId) {
          // Convert normalized message to chat event format
          const chatEvent = {
            conversationId: message.conversationId,
            contactId: payload?.contact?.id || message.raw.contactId || 'unknown',
            direction: message.direction,
            actor: (message.sender === 'contact' ? 'customer' : 
                   message.sender === 'ai_agent' ? 'ai' : 'agent') as 'customer' | 'ai' | 'agent',
            text: message.text,
            timestamp: message.createdAt || new Date().toISOString(),
            correlationId: message.id
          };

          // Store the event
          ChatEventStorage.addEvent(chatEvent);
          log.debug('[Mirror] Stored normalized message:', {
            conversationId: message.conversationId,
            sender: message.sender,
            category: message.category,
            textLength: message.text.length
          });
        }
      }
    }

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
    log.warn('[chat-events] Error:', error);
    // Return safe error response
    const errorResponse = safeMirrorAck({});
    return NextResponse.json(errorResponse, { status: 200 });
  }
}

