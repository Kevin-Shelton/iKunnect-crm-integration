import { NextRequest, NextResponse } from 'next/server';
import { getValidAccessToken } from '@/lib/ghl-api-2.0';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

export async function POST(request: NextRequest) {
  try {
    const { contactId, message, type, locationId } = await request.json();

    if (!contactId || !message || !type || !locationId) {
      return NextResponse.json({ error: 'Missing required fields: contactId, message, type, locationId' }, { status: 400 });
    }

    const token = await getValidAccessToken();
    
    // 1. Send the message using GHL API 2.0
    const messageUrl = `${GHL_API_BASE}/conversations/messages`;

    const messageResponse = await fetch(messageUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
      },
      body: JSON.stringify({
        contactId: contactId,
        message: message,
        type: type, // e.g., 'Webchat'
        locationId: locationId,
      }),
    });

    if (!messageResponse.ok) {
      const error = await messageResponse.json();
      console.error('GHL API 2.0 Send Message Error:', error);
      return NextResponse.json({ success: false, error: 'Failed to send message to GHL', details: error }, { status: messageResponse.status });
    }

    const messageData = await messageResponse.json();

    // 2. Return success response
    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully via GHL API 2.0',
      data: {
        contactId: contactId,
        conversationId: messageData.conversationId, // Assuming GHL returns this
        messageId: messageData.id, // Assuming GHL returns this
        timestamp: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('API 2.0 Send Message Route Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
