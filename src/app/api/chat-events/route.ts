// /app/api/chat-events/route.ts
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { verifyHmac } from '@/lib/hmac';
import { log } from '@/lib/logger';
import { normalizeMessages } from '@/lib/normalize';
import type { MirrorPayload, GhlMessage, NormalizedMessage } from '@/lib/types';
import { ChatEventStorage } from '@/lib/storage';

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

  // Normalize if messages present
  let normalizedMessages: NormalizedMessage[] = [];
  if (Array.isArray(payload?.messages)) {
    const messages = payload.messages as GhlMessage[];
    normalizedMessages = normalizeMessages(messages, payload?.conversation?.id ?? null);
  }

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

  log.debug('[Mirror]', { 
    route: req.nextUrl.pathname, 
    contact: payload?.contact, 
    conv: payload?.conversation,
    messagesProcessed: normalizedMessages.length
  });

  // Always return 200 to keep n8n fast; include minimal ack
  return NextResponse.json({ 
    ok: true, 
    messagesProcessed: normalizedMessages.length,
    conversationId: payload?.conversation?.id
  });
}

