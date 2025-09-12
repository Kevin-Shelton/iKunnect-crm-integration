import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import chatStorage, { ChatEvent } from '@/lib/chat-storage';

// HMAC verification function
function verifyHmac(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
  
  // Remove 'sha256=' prefix if present
  const cleanSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(cleanSignature, 'hex')
  );
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Chat Events Endpoint Called ===');
    
    // Get raw body for HMAC verification
    const body = await request.text();
    const signature = request.headers.get('x-signature') || '';
    const secret = process.env.SHARED_HMAC_SECRET || 'your_shared_hmac_secret_here_change_this_in_production';

    console.log('Request headers:', Object.fromEntries(request.headers.entries()));
    console.log('Body length:', body.length);
    console.log('Signature:', signature);

    console.log('Secret configured:', secret ? 'Yes' : 'No');

    // Verify HMAC signature
    if (!verifyHmac(body, signature, secret)) {
      console.error('HMAC verification failed');
      console.log('Expected signature for body:', crypto.createHmac('sha256', secret).update(body).digest('hex'));
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    console.log('✅ HMAC verification passed');

    // Parse the JSON body
    let chatEvent: ChatEvent;
    try {
      chatEvent = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON body:', error);
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields = ['conversationId', 'contactId', 'direction', 'actor', 'text', 'timestamp', 'correlationId'];
    for (const field of requiredFields) {
      if (!chatEvent[field as keyof ChatEvent]) {
        console.error(`Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate enum values
    if (!['inbound', 'outbound'].includes(chatEvent.direction)) {
      return NextResponse.json(
        { error: 'Invalid direction. Must be inbound or outbound' },
        { status: 400 }
      );
    }

    if (!['customer', 'ai', 'agent'].includes(chatEvent.actor)) {
      return NextResponse.json(
        { error: 'Invalid actor. Must be customer, ai, or agent' },
        { status: 400 }
      );
    }

    console.log('📨 Valid chat event received:', {
      conversationId: chatEvent.conversationId,
      direction: chatEvent.direction,
      actor: chatEvent.actor,
      textLength: chatEvent.text.length,
      timestamp: chatEvent.timestamp
    });

    // Store the event using shared storage
    chatStorage.storeEvent(chatEvent);

    const conversationEvents = chatStorage.getConversationEvents(chatEvent.conversationId);
    console.log(`💾 Stored event. Conversation ${chatEvent.conversationId} now has ${conversationEvents.length} events`);

    // Log current storage state
    console.log(`📊 Storage stats: ${chatStorage.getConversationCount()} conversations total`);

    return NextResponse.json({
      success: true,
      message: 'Chat event received and stored',
      eventId: chatEvent.correlationId,
      conversationId: chatEvent.conversationId,
      totalEvents: conversationEvents.length,
      totalConversations: chatStorage.getConversationCount()
    });

  } catch (error) {
    console.error('Error processing chat event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve events for a conversation (for UI polling)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId parameter required' },
        { status: 400 }
      );
    }

    const events = chatStorage.getConversationEvents(conversationId);
    
    return NextResponse.json({
      success: true,
      conversationId,
      events,
      totalEvents: events.length
    });

  } catch (error) {
    console.error('Error retrieving chat events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

