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

    console.log(`[Pass] Agent ${agentId} passing on conversation ${conversationId}`);

    // Check if conversation exists
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update conversation status to indicate it was passed
    const success = updateConversationStatus(conversationId, {
      status: 'waiting',
      passedBy: agentId,
      passedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      priority: 'low' // Lower priority since it was passed
    });

    if (success) {
      console.log(`[Pass] Conversation ${conversationId} passed by ${agentId}`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        passedAt: new Date().toISOString(),
        message: 'Conversation passed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to pass conversation' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Pass] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
