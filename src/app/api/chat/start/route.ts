import { NextResponse } from 'next/server';
import { upsertContact, getOrCreateConversation, getDefaultLocationId, sendMessage } from '@/lib/ghl-api-client';

// Define the expected request body structure
interface StartChatRequestBody {
  email: string;
  phone: string;
  fullName: string;
}

export async function POST(request: Request) {
  try {
    const body: StartChatRequestBody = await request.json();
    const { email, phone, fullName } = body;

    // 1. Input Validation
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone number is required.' }, { status: 400 });
    }

    console.log('[Chat Start] Starting chat for:', { phone, email, fullName });

    // 2. Get location ID
    const locationId = await getDefaultLocationId();
    console.log('[Chat Start] Using location ID:', locationId);

    // 3. Create or update contact in GHL
    const { contactId } = await upsertContact({
      locationId,
      phone,
      email,
      name: fullName,
    });
    
    console.log('[Chat Start] Contact created/updated:', contactId);

    // 4. Create or get existing conversation in GHL
    const { conversationId } = await getOrCreateConversation({
      locationId,
      contactId,
    });
    
    console.log('[Chat Start] Conversation created/found:', conversationId);

    // 5. Send initial Live_Chat message to establish conversation type
    try {
      await sendMessage({
        contactId,
        message: 'Customer started a new chat.',
        type: 'Live_Chat',
      });
      console.log('[Chat Start] Initial Live_Chat message sent to GHL');
    } catch (error) {
      console.error('[Chat Start] Failed to send initial message:', error);
      // Continue anyway - the conversation is created
    }

    // 6. Response with real GHL IDs
    return NextResponse.json({
      contactId,
      conversationId,
      contactName: fullName || 'New Contact',
      contactEmail: email,
      contactPhone: phone,
      initialMessage: 'Customer started a new chat.'
    });

  } catch (error) {
    console.error('[Chat Start] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ 
      error: 'Failed to start chat',
      details: errorMessage 
    }, { status: 500 });
  }
}
