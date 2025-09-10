import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '25');

    const crmClient = createCRMClient();

    // Get messages for the conversation
    const messagesResult = await crmClient.getMessages(conversationId, limit);

    if (!messagesResult.success) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: messagesResult.error },
        { status: 500 }
      );
    }

    // Get conversation details
    const conversationResult = await crmClient.getConversation(conversationId);
    
    // Get contact details if conversation has contactId
    let contact = null;
    if (conversationResult.success && conversationResult.data?.contactId) {
      const contactResult = await crmClient.getContact(conversationResult.data.contactId);
      if (contactResult.success) {
        contact = contactResult.data;
      }
    }

    return NextResponse.json({
      success: true,
      messages: messagesResult.data?.items || [],
      conversation: conversationResult.data || null,
      contact,
      total: messagesResult.data?.total || 0,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching messages:', error);
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

