import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToContact, sendMessage, sendInboundMessage, upsertContact, getDefaultLocationId } from '@/lib/ghl-api-client';

/**
 * API route for sending messages via GHL API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message, email, name, conversationId } = body;

    // Validate required fields
    if (!phone || !message) {
      return NextResponse.json(
        { error: 'Phone and message are required' },
        { status: 400 }
      );
    }

    console.log('[Send GHL] ========================================');
    console.log('[Send GHL] Received message request:', { phone, conversationId, message: message.substring(0, 50) + '...' });
    console.log('[Send GHL] conversationId provided?', !!conversationId);
    console.log('[Send GHL] conversationId value:', conversationId);

    // Get the location ID (in a multi-location setup, this would come from the user's context)
    const locationId = await getDefaultLocationId();
    console.log('[Send GHL] Using location ID:', locationId);

    let result;
    
    // If conversationId is provided, reuse it (subsequent messages)
    console.log('[Send GHL] Checking if conversationId exists:', conversationId);
    if (conversationId) {
      console.log('[Send GHL] Reusing existing conversation:', conversationId);
      
      // Get or create contact (to ensure we have contactId)
      const { contactId } = await upsertContact({
        locationId,
        phone,
        email,
        name,
      });
      
      // Send message to existing conversation using inbound endpoint
      const { messageId, conversationId: returnedConvId } = await sendInboundMessage({
        locationId,
        conversationId,
        contactId,
        message,
        type: 'Live_Chat',
        // conversationProviderId is optional, will try without it first
      });
      
      result = {
        contactId,
        conversationId,
        messageId,
      };
    } else {
      // First message - create contact and conversation
      console.log('[Send GHL] ⚠️ NO conversationId - Creating NEW conversation');
      console.log('[Send GHL] This should only happen on first message!');
      result = await sendMessageToContact({
        locationId,
        phone,
        message,
        email,
        name,
        type: 'Live_Chat',
      });
    }

    console.log('[Send GHL] Message sent successfully:', result);

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('[Send GHL] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
