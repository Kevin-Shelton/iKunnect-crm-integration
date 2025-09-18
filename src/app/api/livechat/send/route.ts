export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { upsertMessages } from '@/lib/chatStorage';
import type { NormalizedMessage } from '@/lib/types';

const N8N_WEBHOOK_URL = 'https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound';
const SHARED_HMAC_SECRET = process.env.SHARED_HMAC_SECRET;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.conversation?.id) {
      return NextResponse.json({
        ok: false,
        error: 'conversation.id is required'
      }, { status: 400 });
    }
    
    if (!body.message?.text?.trim()) {
      return NextResponse.json({
        ok: false,
        error: 'message.text is required'
      }, { status: 400 });
    }
    
    // Normalize payload for n8n
    const payload = {
      type: 'inbound',
      provider: 'custom',
      conversation: {
        id: body.conversation.id
      },
      messageId: body.message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      text: body.message.text.trim(),
      channel: body.channel || 'webchat',
      locationId: body.locationId || 'DKs2AdSvw0MGWJYyXwk1',
      contact: body.contact || {},
      lang: body.lang || 'en',
      timestamp: new Date().toISOString()
    };
    
    // Generate HMAC signature
    const payloadString = JSON.stringify(payload);
    let signature = '';
    
    if (SHARED_HMAC_SECRET) {
      signature = crypto
        .createHmac('sha256', SHARED_HMAC_SECRET)
        .update(payloadString, 'utf8')
        .digest('hex');
    }

    // Store message in local storage
    const normalizedMessage: NormalizedMessage = {
      id: payload.messageId,
      conversationId: payload.conversation.id,
      direction: 'inbound',
      sender: 'contact',
      category: 'chat',
      text: payload.text,
      createdAt: payload.timestamp,
      raw: {
        id: payload.messageId,
        direction: 'inbound',
        type: 29, // TYPE_LIVE_CHAT
        body: payload.text,
        conversationId: payload.conversation.id,
        dateAdded: payload.timestamp,
        locationId: payload.locationId,
        contactId: payload.contact?.id || null,
        source: 'webchat'
      }
    };
    
    upsertMessages(payload.conversation.id, [normalizedMessage]);
    
    console.log('[LiveChat Send] Message stored locally:', {
      conversationId: payload.conversation.id,
      messageId: payload.messageId,
      text: payload.text
    });
    
    // Forward to n8n webhook
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature && { 'X-Signature': `sha256=${signature}` })
      },
      body: payloadString
    });
    
    // Log the attempt
    console.log('[LiveChat Send]', {
      conversationId: payload.conversation.id,
      messageId: payload.messageId,
      n8nStatus: response.status,
      timestamp: payload.timestamp
    });
    
    // Return success immediately (don't wait for n8n processing)
    return NextResponse.json({
      ok: true,
      messageId: payload.messageId,
      conversationId: payload.conversation.id
    });
    
  } catch (error) {
    console.error('[LiveChat Send Error]', error);
    return NextResponse.json({
      ok: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

