import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/productionStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`[Chat Messages] Fetching messages for conversation: ${id}`);
    
    const conversation = await getConversation(id);
    
    if (!conversation) {
      console.log(`[Chat Messages] Conversation ${id} not found`);
      return NextResponse.json({
        success: true,
        messages: [],
        contact: null,
        total: 0
      });
    }
    
    // Transform messages to API format
    const messages = conversation.messages.map(msg => ({
      id: msg.id,
      text: msg.text,
      sender: msg.sender === 'customer' ? 'contact' : 'agent',
      timestamp: msg.timestamp,
      type: msg.sender === 'customer' ? 'inbound' : 'outbound',
      contactId: conversation.id
    }));
    
    const contact = {
      id: conversation.id,
      name: conversation.customerName,
      email: '',
      phone: '',
      locationId: ''
    };
    
    console.log(`[Chat Messages] Returning ${messages.length} messages for conversation ${id}`);
    
    return NextResponse.json({
      success: true,
      messages,
      contact,
      total: messages.length
    });
    
  } catch (error) {
    console.error('[Chat Messages] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      messages: [],
      contact: null,
      total: 0
    }, { status: 500 });
  }
}

