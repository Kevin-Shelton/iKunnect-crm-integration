import { NextRequest, NextResponse } from 'next/server';
import { getConversationMessages } from '@/lib/unifiedStorage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    console.log('[Messages API] Fetching messages for conversation:', conversationId, { limit });

    // Get conversation messages from unified storage
    const result = await getConversationMessages(conversationId, limit);
    
    if (!result.messages || result.messages.length === 0) {
      console.log('[Messages API] No messages found for conversation:', conversationId);
      return NextResponse.json({
        success: true,
        messages: [],
        contact: result.contact || {
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

    // Transform normalized messages to API format expected by the frontend
    const messages = result.messages.map((msg) => ({
      id: msg.id,
      text: msg.text || '',
      sender: msg.sender || 'contact',
      timestamp: msg.createdAt || new Date().toISOString(),
      type: msg.direction || 'inbound',
      contactId: msg.conversationId || null
    }));

    console.log('[Messages API] Returning messages for conversation:', conversationId, {
      messageCount: messages.length,
      hasContact: !!result.contact,
      total: result.total,
      firstMessage: messages[0]?.text?.substring(0, 50),
      lastMessage: messages[messages.length - 1]?.text?.substring(0, 50)
    });

    return NextResponse.json({
      success: true,
      messages: messages,
      contact: result.contact || {
        id: conversationId,
        name: `Customer ${conversationId.slice(-4)}`,
        email: '',
        phone: '',
        locationId: ''
      },
      total: result.total,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Messages API] Error fetching messages:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
