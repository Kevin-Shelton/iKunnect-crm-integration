import { NextRequest, NextResponse } from 'next/server';
import { getChatHistory } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let conversationId = 'unknown';
  try {
    const { id } = await params;
    conversationId = id;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('[Messages API] Fetching messages for conversation:', conversationId, { limit });

    // Get chat history
    const chatEvents = await getChatHistory(conversationId, limit);
    console.log('[Messages API] Found chat events:', chatEvents?.length || 0);

    if (!chatEvents || chatEvents.length === 0) {
      console.log('[Messages API] No chat events found for conversation:', conversationId);
      return NextResponse.json({
        success: true,
        messages: [],
        contact: {
          id: conversationId,
          name: `Customer ${conversationId.slice(-4)}`,
          email: '',
          phone: '',
          locationId: ''
        },
        total: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Extract customer info from first event that has it
    let customerName = `Customer ${conversationId.slice(-4)}`;
    let customerEmail = '';
    let customerPhone = '';
    let customerLanguage = 'en'; // Default to English
    
    for (const event of chatEvents) {
      const payload = event.payload as any;
      const contact = payload?.contact;
      if (contact?.name) {
        customerName = contact.name;
        customerEmail = contact.email || customerEmail;
        customerPhone = contact.phone || customerPhone;
      }
      // Extract customer language from any event that has it
      if (event.customer_language) {
        customerLanguage = event.customer_language;
      }
    }
    
    // Transform chat events to messages - DIRECT MAPPING
    const messages = chatEvents
      .filter((event: any) => 
        event.type === 'inbound' || 
        event.type === 'agent_send' || 
        event.type === 'ai_agent_send' || 
        event.type === 'human_agent_send' ||
        event.type === 'admin' // Include system greeting messages
      )
      .map((event: any) => {
        // Determine sender type
        let sender: 'customer' | 'agent' | 'ai_agent' | 'human_agent' | 'system';
        if (event.type === 'inbound') {
          sender = 'customer';
        } else if (event.type === 'ai_agent_send') {
          sender = 'ai_agent';
        } else if (event.type === 'human_agent_send') {
          sender = 'human_agent';
        } else if (event.type === 'admin') {
          sender = 'system'; // System greeting messages
        } else {
          sender = 'agent'; // fallback for legacy 'agent_send' type
        }

        return {
          id: event.message_id || event.id,
          text: event.text || '',
          sender: sender,
          timestamp: event.created_at,
          type: event.type === 'inbound' ? 'inbound' : 'outbound',
          contactId: conversationId
        };
      });

    console.log('[Messages API Secure] Transformed messages:', {
      messageCount: messages.length,
      conversationId,
      sampleMessages: messages.slice(0, 2).map(m => ({ id: m.id, text: m.text?.substring(0, 50), sender: m.sender }))
    });

    return NextResponse.json({
      success: true,
      messages: messages,
      contact: {
        id: conversationId,
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        locationId: '',
        language: customerLanguage
      },
      total: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Messages API Secure] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      messages: [],
      contact: {
        id: conversationId,
        name: `Customer ${conversationId.slice(-4)}`,
        email: '',
        phone: '',
        locationId: ''
      },
      total: 0,
      timestamp: new Date().toISOString(),
      error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
