import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToContact, sendMessage, upsertContact, getDefaultLocationId } from '@/lib/ghl-api-client';

/**
 * API route for sending messages via GHL API (replaces n8n webhook)
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

    console.log('[Send GHL] Received message request:', { phone, conversationId, message: message.substring(0, 50) + '...' });

    // Get the location ID (in a multi-location setup, this would come from the user's context)
    const locationId = await getDefaultLocationId();
    console.log('[Send GHL] Using location ID:', locationId);

    let result;
    
    // If conversationId is provided, reuse it (subsequent messages)
    if (conversationId) {
      console.log('[Send GHL] Reusing existing conversation:', conversationId);
      
      // Get or create contact (to ensure we have contactId)
      const { contactId } = await upsertContact({
        locationId,
        phone,
        email,
        name,
      });
      
      // Send message directly to existing conversation
      const { messageId } = await sendMessage({
        locationId,
        conversationId,
        contactId,
        message,
        type: 'SMS',
      });
      
      result = {
        contactId,
        conversationId,
        messageId,
      };
    } else {
      // First message - create contact and conversation
      console.log('[Send GHL] Creating new conversation');
      result = await sendMessageToContact({
        locationId,
        phone,
        message,
        email,
        name,
        type: 'SMS',
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
