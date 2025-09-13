import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'customer'; // customer, ai, agent
    const conversationId = searchParams.get('conversationId') || `conv_${Date.now()}`;
    const contactId = searchParams.get('contactId') || `contact_${Date.now()}`;
    const message = searchParams.get('message') || 'Test message';

    console.log('🧪 Creating test chat event:', { type, conversationId, contactId, message });

    // Create test chat event
    const chatEvent = {
      conversationId,
      contactId,
      direction: type === 'customer' ? 'inbound' : 'outbound',
      actor: type,
      text: message,
      timestamp: new Date().toISOString(),
      correlationId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Get HMAC secret
    const secret = process.env.SHARED_HMAC_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'SHARED_HMAC_SECRET not configured' },
        { status: 500 }
      );
    }

    // Create HMAC signature
    const body = JSON.stringify(chatEvent);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');

    console.log('🔐 Generated HMAC signature:', signature);

    // Send to chat-events endpoint
    const response = await fetch(`${request.nextUrl.origin}/api/chat-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': `sha256=${signature}`
      },
      body
    });

    const result = await response.json();

    console.log('📨 Chat event response:', result);

    return NextResponse.json({
      success: true,
      message: 'Test chat event sent successfully',
      testEvent: chatEvent,
      signature: `sha256=${signature}`,
      response: result
    });

  } catch (error) {
    console.error('Error creating test chat event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to create multiple test events for a conversation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId') || `conv_${Date.now()}`;
    const contactId = searchParams.get('contactId') || `contact_${Date.now()}`;

    console.log('🧪 Creating test conversation:', { conversationId, contactId });

    const testMessages = [
      { actor: 'customer', text: 'Hi, I need help with my order', delay: 0 },
      { actor: 'ai', text: 'Hello! I\'d be happy to help you with your order. Can you please provide your order number?', delay: 2000 },
      { actor: 'customer', text: 'My order number is #12345', delay: 5000 },
      { actor: 'ai', text: 'Thank you! I can see your order #12345. It looks like it was shipped yesterday and should arrive within 2-3 business days. Would you like me to provide the tracking information?', delay: 3000 },
      { actor: 'customer', text: 'Yes please, that would be great', delay: 4000 }
    ];

    const results = [];
    const secret = process.env.SHARED_HMAC_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: 'SHARED_HMAC_SECRET not configured' },
        { status: 500 }
      );
    }

    // Send messages with delays
    for (let i = 0; i < testMessages.length; i++) {
      const msg = testMessages[i];
      
      // Wait for delay
      if (msg.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, msg.delay));
      }

      const chatEvent = {
        conversationId,
        contactId,
        direction: msg.actor === 'customer' ? 'inbound' : 'outbound',
        actor: msg.actor,
        text: msg.text,
        timestamp: new Date().toISOString(),
        correlationId: `test_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`
      };

      const body = JSON.stringify(chatEvent);
      const signature = crypto
        .createHmac('sha256', secret)
        .update(body, 'utf8')
        .digest('hex');

      try {
        const response = await fetch(`${request.nextUrl.origin}/api/chat-events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-signature': `sha256=${signature}`
          },
          body
        });

        const result = await response.json();
        results.push({
          message: msg.text,
          actor: msg.actor,
          success: result.success,
          response: result
        });

        console.log(`📨 Sent message ${i + 1}/${testMessages.length}:`, msg.text.substring(0, 50));
      } catch (error) {
        console.error(`Error sending message ${i + 1}:`, error);
        results.push({
          message: msg.text,
          actor: msg.actor,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test conversation created successfully',
      conversationId,
      contactId,
      messagesCount: testMessages.length,
      results
    });

  } catch (error) {
    console.error('Error creating test conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

