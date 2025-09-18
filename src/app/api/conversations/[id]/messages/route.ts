import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/chatStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    // Get conversation from in-memory storage
    const conversation = getConversation(conversationId);
    
    if (!conversation || !conversation.messages) {
      console.log('[Messages API] No conversation found for ID:', conversationId);
      return NextResponse.json({
        success: true,
        messages: [],
        contact: null,
        total: 0,
        timestamp: new Date().toISOString()
      });
    }

    // Transform normalized messages to API format
    const messages = conversation.messages.slice(-limit).map((msg) => ({
      id: msg.id,
      text: msg.text || '',
      sender: msg.sender || 'contact',
      timestamp: msg.createdAt || new Date().toISOString(),
      type: msg.type || 'inbound',
      contactId: msg.contactId || null
    }));

    // Extract contact info from the first message
    let contact = null;
    if (messages.length > 0) {
      const firstMessage = conversation.messages[0];
      contact = {
        id: firstMessage.contactId || conversationId,
        name: firstMessage.contactName || `Customer ${conversationId.slice(-4)}`,
        email: firstMessage.contactEmail || '',
        phone: firstMessage.contactPhone || '',
        locationId: firstMessage.locationId || ''
      };
    }

    console.log('[Messages API] Returning messages for conversation:', conversationId, {
      messageCount: messages.length,
      hasContact: !!contact,
      totalInStorage: conversation.messages.length
    });

    return NextResponse.json({
      success: true,
      messages: messages,
      contact,
      total: messages.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Messages API] Error fetching messages:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

