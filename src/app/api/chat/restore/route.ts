import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations, updateConversationStatus } from '@/lib/memory-storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1' } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Restore] Agent ${agentId} restoring conversation ${conversationId}`);

    // Check if conversation exists
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Check if conversation is actually rejected
    if (conversation.status.status !== 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Conversation is not in rejected status' },
        { status: 400 }
      );
    }

    // Update conversation status to restore it to waiting
    const success = updateConversationStatus(conversationId, {
      status: 'waiting',
      restoredBy: agentId,
      restoredAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      hidden: false, // Make it visible again
      priority: 'normal', // Reset priority
      // Clear rejection fields
      rejectedBy: undefined,
      rejectedAt: undefined,
      rejectionReason: undefined
    });

    if (success) {
      console.log(`[Restore] Conversation ${conversationId} restored by ${agentId}`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        restoredAt: new Date().toISOString(),
        message: 'Conversation restored successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to restore conversation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Restore] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
