import { NextRequest, NextResponse } from 'next/server';
import { 
  updateConversationStatus,
  getAllConversationsWithStatus,
  initializeConversationStatus
} from '@/lib/supabase-conversations';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1' } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Pass] Agent ${agentId} passing on conversation ${conversationId} using Supabase`);

    // Initialize conversation status table if needed
    await initializeConversationStatus();

    // Check if conversation exists
    const conversations = await getAllConversationsWithStatus();
    const conversation = conversations.find(c => c.id === conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update conversation status to indicate it was passed (back to waiting)
    const success = await updateConversationStatus(conversationId, 'passed', { 
      passedBy: agentId 
    });

    if (success) {
      console.log(`[Pass] Conversation ${conversationId} passed by ${agentId} in Supabase`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        passedAt: new Date().toISOString(),
        message: 'Conversation passed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update conversation status in Supabase' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Pass] Supabase error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Supabase error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
