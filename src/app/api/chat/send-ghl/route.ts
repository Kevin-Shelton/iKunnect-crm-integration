import { NextRequest, NextResponse } from 'next/server';
import { sendMessageToContact, getDefaultLocationId } from '@/lib/ghl-api-client';

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

    console.log('[Send GHL] Received message request:', { phone, message: message.substring(0, 50) + '...' });

    // Get the location ID (in a multi-location setup, this would come from the user's context)
    const locationId = await getDefaultLocationId();
    console.log('[Send GHL] Using location ID:', locationId);

    // Send message using GHL API
    const result = await sendMessageToContact({
      locationId,
      phone,
      message,
      email,
      name,
      type: 'SMS', // Default to SMS, can be made configurable
    });

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
