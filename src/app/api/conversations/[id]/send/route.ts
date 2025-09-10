import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import { MessageInput } from '@/lib/types';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    
    const { message, attachments } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message body is required and cannot be empty' },
        { status: 400 }
      );
    }

    const crmClient = createCRMClient();

    // Get conversation details to get contactId
    const conversationResult = await crmClient.getConversation(conversationId);
    
    if (!conversationResult.success || !conversationResult.data?.contactId) {
      return NextResponse.json(
        { error: 'Conversation not found or missing contact ID' },
        { status: 404 }
      );
    }

    const messageData: MessageInput = {
      conversationId,
      contactId: conversationResult.data.contactId,
      body: message.trim(),
      direction: 'outbound',
      channel: 'chat'
    };

    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    // Send the message
    const sendResult = await crmClient.sendMessage(messageData);

    if (!sendResult.success) {
      return NextResponse.json(
        { error: 'Failed to send message', details: sendResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: sendResult.data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error sending message:', error);
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

