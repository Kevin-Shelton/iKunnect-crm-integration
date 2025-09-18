import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/unifiedStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log(`[Chat Messages] Fetching messages for conversation: ${id} from unified storage`);
    
    const conversation = await getConversation(id);
    
    if (!conversation) {
      console.log(`[Chat Messages] Conversation ${id} not found in unified storage`);
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
      sender: msg.sender,
      timestamp: msg.createdAt,
      type: msg.sender === 'contact' ? 'inbound' : 'outbound',
      contactId: conversation.contact?.id || conversation.id
    }));
    
    const contact = {
      id: conversation.contact?.id || conversation.id,
      name: conversation.contact?.name || conversation.customerName || `Customer ${conversation.id}`,
      email: conversation.contact?.email || '',
      phone: conversation.contact?.phone || '',
      locationId: conversation.contact?.locationId || ''
    };
    
    console.log(`[Chat Messages] Returning ${messages.length} messages for conversation ${id} from unified storage`);
    
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
