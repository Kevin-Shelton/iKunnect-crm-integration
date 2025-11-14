import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { upsertMessages } from '@/lib/chatStorage';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GHL Webhook Handler
 * Receives messages from GHL (customer, AI agent, human agent) and syncs to app
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[GHL Webhook] ========================================');
    console.log('[GHL Webhook] Received webhook call');
    
    // Parse the webhook payload
    const payload = await request.json();
    console.log('[GHL Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Extract relevant data from GoHighLevel webhook
    const {
      type,
      contactId,
      locationId,
      conversationId,
      messageId,
      body: messageBody,
      message,
      direction,
      contentType,
      attachments,
      userId,
      dateAdded
    } = payload;

    const messageText = messageBody || message || '';

    if (!messageText || !conversationId) {
      console.log('[GHL Webhook] Skipping - no message text or conversationId');
      return NextResponse.json({ status: 'ignored', reason: 'missing required fields' });
    }

    console.log('[GHL Webhook] Processing message:', {
      conversationId,
      contactId,
      direction,
      type,
      messageText: messageText.substring(0, 100) + '...'
    });

    // Determine sender type based on direction and userId
    let sender: 'contact' | 'human_agent' | 'ai_agent' | 'system' = 'contact';
    let eventType = 'inbound';
    
    // If direction is provided, use it
    if (direction === 'outbound') {
      // Outbound messages could be from AI agent or human agent
      if (userId) {
        sender = 'human_agent';
        eventType = 'outbound';
      } else {
        // No userId means it's from AI agent
        sender = 'ai_agent';
        eventType = 'outbound';
      }
    } else if (direction === 'inbound') {
      sender = 'contact';
      eventType = 'inbound';
    } else {
      // If direction is missing, assume it's from customer (workflow default)
      // Unless there's a userId, which means it's from an agent
      if (userId) {
        sender = 'human_agent';
        eventType = 'outbound';
      } else {
        sender = 'contact';
        eventType = 'inbound';
      }
    }

    console.log('[GHL Webhook] Determined sender:', sender, 'eventType:', eventType);

    // Save to Supabase chat_events table
    try {
      const chatEvent = {
        conversation_id: conversationId,
        event_type: eventType,
        payload: {
          text: messageText,
          type: eventType,
          channel: 'Live_Chat',
          conversation: { id: conversationId },
          contact: { id: contactId },
          timestamp: dateAdded || new Date().toISOString(),
          source: 'ghl_webhook',
          sender,
          messageId,
          direction,
          contentType,
          attachments,
          userId
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_events')
        .insert([chatEvent])
        .select();

      if (error) {
        console.error('[GHL Webhook] Supabase insert error:', error);
      } else {
        console.log('[GHL Webhook] Message saved to Supabase:', data?.[0]?.id);
      }
    } catch (error) {
      console.error('[GHL Webhook] Error saving to Supabase:', error);
    }

    // Add to in-memory chat storage for real-time updates
    try {
      upsertMessages(conversationId, [{
        id: messageId || Date.now().toString(),
        text: messageText,
        sender: sender,
        createdAt: dateAdded || new Date().toISOString(),
        conversationId: conversationId,
        direction: direction || 'inbound',
        category: 'chat',
        raw: payload as any
      }]);
      console.log('[GHL Webhook] Message added to in-memory storage');
    } catch (error) {
      console.error('[GHL Webhook] Error adding to in-memory storage:', error);
    }

    return NextResponse.json({ 
      status: 'processed',
      messageId,
      conversationId,
      sender,
      synced: true
    });

  } catch (error) {
    console.error('[GHL Webhook] Error processing webhook:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    // GoHighLevel webhook verification
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ 
    status: 'GoHighLevel webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
