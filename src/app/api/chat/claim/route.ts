import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllConversations as getAllConversationsPersistent,
  updateConversationStatus as updateConversationStatusPersistent
} from '@/lib/persistent-storage';

async function claimConversationWithStatus(conversationId: string, agentId: string) {
  const success = await updateConversationStatusPersistent(conversationId, {
    status: 'assigned',
    agentId,
    claimedAt: new Date().toISOString()
  });
  
  if (success) {
    console.log(`[Claim] Conversation ${conversationId} claimed by ${agentId}`);
    
    return NextResponse.json({
      success: true,
      conversationId,
      agentId,
      claimedAt: new Date().toISOString(),
      message: 'Conversation claimed successfully'
    });
  } else {
    return NextResponse.json(
      { success: false, error: 'Failed to claim conversation' },
      { status: 409 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { conversationId, agentId = 'agent_1' } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    console.log(`[Claim] Attempting to claim conversation ${conversationId} for agent ${agentId}`);

    // Debug: Check what conversations exist in persistent storage
    const allConversations = await getAllConversationsPersistent();
    console.log(`[Claim] Available conversations:`, allConversations.map(c => ({ 
      id: c.id, 
      status: c.status?.status,
      messageCount: c.messageCount 
    })));

    // Check if conversation exists
    const conversation = allConversations.find(c => c.id === conversationId);
    if (!conversation) {
      console.log(`[Claim] Conversation ${conversationId} not found in persistent storage`);
      
      return NextResponse.json(
        { success: false, error: `Conversation not found. Available: ${allConversations.map(c => c.id).join(', ')}` },
        { status: 404 }
      );
    }

    // Attempt to claim the conversation
    return await claimConversationWithStatus(conversationId, agentId);

  } catch (error) {
    console.error('[Claim] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
