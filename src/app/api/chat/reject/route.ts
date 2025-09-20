import { NextRequest, NextResponse } from 'next/server';
import { 
  updateConversationStatus,
  getAllConversationsWithStatus,
  initializeConversationStatus
} from '@/lib/supabase-conversations';

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1', reason = 'No reason provided' } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Reject] Agent ${agentId} rejecting conversation ${conversationId} using Supabase - Reason: ${reason}`);

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

    // Update conversation status to rejected using Supabase
    const success = await updateConversationStatus(conversationId, 'rejected', { 
      rejectedBy: agentId,
      rejectionReason: reason
    });

    if (success) {
      console.log(`[Reject] Conversation ${conversationId} rejected by ${agentId} in Supabase`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        rejectedAt: new Date().toISOString(),
        rejectionReason: reason,
        message: 'Conversation rejected successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update conversation status in Supabase' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Reject] Supabase error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Supabase error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}
