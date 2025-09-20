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

    console.log(`[Claim] Attempting to claim conversation ${conversationId} for agent ${agentId} using Supabase`);

    // Initialize conversation status table if needed
    await initializeConversationStatus();

    // Get all conversations to verify the conversation exists
    const allConversations = await getAllConversationsWithStatus();
    console.log(`[Claim] Available conversations:`, allConversations.map(c => ({ 
      id: c.id, 
      status: c.status?.status || 'waiting',
      messageCount: c.messageCount 
    })));

    // Check if conversation exists
    const conversation = allConversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.log(`[Claim] Conversation ${conversationId} not found in Supabase`);
      
      return NextResponse.json(
        { success: false, error: `Conversation not found. Available: ${allConversations.map(c => c.id).join(', ')}` },
        { status: 404 }
      );
    }

    // Check if conversation is already assigned
    if (conversation.status?.status === 'assigned') {
      return NextResponse.json(
        { success: false, error: 'Conversation is already assigned to another agent' },
        { status: 409 }
      );
    }

    // Claim the conversation using Supabase
    const success = await updateConversationStatus(conversationId, 'assigned', { agentId });
    
    if (success) {
      console.log(`[Claim] Conversation ${conversationId} successfully claimed by ${agentId} in Supabase`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        claimedAt: new Date().toISOString(),
        message: 'Conversation claimed successfully'
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to update conversation status in Supabase' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[Claim] Supabase error:', error);
    return NextResponse.json(
      { success: false, error: `Supabase error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
