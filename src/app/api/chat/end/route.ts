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

    console.log(`[End Chat] Agent ${agentId} ending conversation ${conversationId} using Supabase`);

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

    // Update conversation status to ended/completed
    const success = await updateConversationStatus(conversationId, 'rejected', { 
      rejectedBy: agentId,
      rejectionReason: 'Chat ended by agent'
    });

    if (success) {
      console.log(`[End Chat] Conversation ${conversationId} ended by ${agentId} in Supabase`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        endedAt: new Date().toISOString(),
        message: 'Chat ended successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to end conversation in Supabase' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[End Chat] Supabase error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Supabase error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
