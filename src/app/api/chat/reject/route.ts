import { NextRequest, NextResponse } from 'next/server';
import { getAllConversations, updateConversationStatus } from '@/lib/memory-storage';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1', reason = 'No reason provided' } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Reject] Agent ${agentId} rejecting conversation ${conversationId} - Reason: ${reason}`);

    // Check if conversation exists
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update conversation status to indicate it was rejected
    const success = updateConversationStatus(conversationId, {
      status: 'rejected',
      rejectedBy: agentId,
      rejectedAt: new Date().toISOString(),
      rejectionReason: reason,
      lastActivity: new Date().toISOString(),
      hidden: true // Hide from main queue but keep in system
    });

    if (success) {
      console.log(`[Reject] Conversation ${conversationId} rejected by ${agentId}`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        rejectedAt: new Date().toISOString(),
        reason,
        message: 'Conversation rejected successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to reject conversation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Reject] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
