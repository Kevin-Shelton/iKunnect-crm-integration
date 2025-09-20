import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations, deleteConversation } from '@/lib/memory-storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1', confirm = false } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Delete] Agent ${agentId} attempting to delete conversation ${conversationId}`);

    // Check if conversation exists
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Only allow deletion of rejected conversations for safety
    if (conversation.status.status !== 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Only rejected conversations can be permanently deleted' },
        { status: 400 }
      );
    }

    // Require explicit confirmation for permanent deletion
    if (!confirm) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Permanent deletion requires confirmation',
          requiresConfirmation: true,
          conversationInfo: {
            contactName: conversation.status.id,
            messageCount: conversation.messageCount,
            rejectedAt: conversation.status.rejectedAt,
            rejectedBy: conversation.status.rejectedBy
          }
        },
        { status: 400 }
      );
    }

    // Perform permanent deletion
    const success = deleteConversation(conversationId);

    if (success) {
      console.log(`[Delete] Conversation ${conversationId} permanently deleted by ${agentId}`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        deletedAt: new Date().toISOString(),
        message: 'Conversation permanently deleted'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete conversation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Delete] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
