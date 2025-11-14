import { NextRequest, NextResponse } from 'next/server';
import { sendMessage, getDefaultLocationId } from '@/lib/ghl-api-client';

/**
 * API route for sending agent messages to GHL
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, contactId, message } = body;

    // Validate required fields
    if (!conversationId || !contactId || !message) {
      return NextResponse.json(
        { error: 'conversationId, contactId, and message are required' },
        { status: 400 }
      );
    }

    console.log('[Agent Send] ========================================');
    console.log('[Agent Send] Sending agent message to GHL:', { 
      conversationId, 
      contactId, 
      message: message.substring(0, 50) + '...' 
    });

    // Get the location ID
    const locationId = await getDefaultLocationId();
    console.log('[Agent Send] Using location ID:', locationId);

    // Send message to GHL with Live_Chat type
    const { messageId } = await sendMessage({
      locationId,
      conversationId,
      contactId,
      message,
      type: 'Live_Chat',
    });

    console.log('[Agent Send] Message sent successfully to GHL:', messageId);

    return NextResponse.json({
      success: true,
      data: {
        messageId,
        conversationId,
        contactId,
      },
    });

  } catch (error) {
    console.error('[Agent Send] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'Failed to send agent message',
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
