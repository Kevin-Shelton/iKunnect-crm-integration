import { NextResponse } from 'next/server';

import { ghlIntegration } from '@/lib/ghl-integration';

// Define the expected request body structure
interface StartChatRequestBody {
  email: string;
  phone: string;
  fullName: string;
}

// Helper function to find the most recent open conversation
async function findOrCreateConversation(contactId: string): Promise<{ conversationId: string, contactName: string }> {
  // In a real-world scenario, this would query GHL/MCP for open conversations
  // For this implementation, we will simulate the logic:
  
  // 1. Attempt to find an existing open conversation for the contact
  // This is a placeholder for a complex MCP query
  const existingConversationId = null; // Assume no existing open conversation for simplicity

  if (existingConversationId) {
    // Placeholder for getting the contact's name from the existing conversation
    const contactName = 'Existing Customer'; 
    return { conversationId: existingConversationId, contactName };
  }

  // 2. If no open conversation is found, create a new one
  // In a real GHL integration, this would be a specific API call.
  // For now, we will generate a unique ID to simulate a new conversation.
  const newConversationId = `conv_${contactId}_${Date.now()}`;
  
  // Placeholder for getting the contact's name (which was set during contact creation/lookup)
  const contactName = 'New Customer'; 

  return { conversationId: newConversationId, contactName };
}

export async function POST(request: Request) {
  try {
    const body: StartChatRequestBody = await request.json();
    const { email, phone, fullName } = body;

    // 1. Input Validation
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone number is required.' }, { status: 400 });
    }


    const locationId = process.env.GHL_LOCATION_ID; // Get the configured Location ID from env

    if (!locationId) {
      return NextResponse.json(
        { error: 'GHL_LOCATION_ID environment variable is not configured' },
        { status: 500 }
      );
    }


    // 2. Contact Lookup/Creation
    let contactId: string | null = null;
    let contactName: string = fullName || 'New Contact';

    // --- Placeholder for actual MCP Contact Search/Create logic ---
    // In a real app, this would involve a sequence of MCP calls:
    // 1. Search by email/phone
    // 2. If found, use existing contactId and name
    // 3. If not found, create a new contact with provided details and get new contactId

    // SIMULATION:
    if (email === 'test@example.com' || phone === '5555555555') {
        // Simulate finding an existing contact
        contactId = 'contact_existing_123';
        contactName = fullName || 'Existing Customer';
    } else {
        // Simulate creating a new contact
        contactId = `contact_new_${Date.now()}`;
        contactName = fullName || 'New Customer';
    }
    
    if (!contactId) {
        return NextResponse.json({ error: 'Failed to create or find contact.' }, { status: 500 });
    }
    // --------------------------------------------------------------

    // 3. Conversation Lookup/Creation
    const { conversationId, contactName: finalContactName } = await findOrCreateConversation(contactId);

    // 4. Response
    return NextResponse.json({ 
      contactId, 
      conversationId, 
      contactName: finalContactName 
    });

  } catch (error) {
    console.error('Error in /api/chat/start:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
