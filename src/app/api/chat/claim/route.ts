import { NextRequest, NextResponse } from 'next/server';
import { claimConversation, getConversationStatus, getAllConversations } from '@/lib/memory-storage';

async function claimConversationWithStatus(conversationId: string, agentId: string) {
  const success = claimConversation(conversationId, agentId);
  
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

    // Debug: Check what conversations exist in memory
    const allConversations = getAllConversations();
    console.log(`[Claim] Available conversations:`, allConversations.map(c => ({ 
      id: c.id, 
      status: c.status?.status,
      messageCount: c.messageCount 
    })));

    // Check if conversation exists
    const status = getConversationStatus(conversationId);
    if (!status) {
      console.log(`[Claim] Conversation ${conversationId} not found in status store`);
      
      // Check if it exists in message store but not status store
      const conversations = getAllConversations();
      const foundInMessages = conversations.find(c => c.id === conversationId);
      
      if (foundInMessages) {
        console.log(`[Claim] Found conversation in messages but not in status store, creating status`);
        // Create missing status
        const newStatus = {
          id: conversationId,
          status: 'waiting' as const,
          lastActivity: new Date().toISOString()
        };
        
        // Manually add to status store
        if (globalThis.__conversationStatusStore) {
          globalThis.__conversationStatusStore.set(conversationId, newStatus);
        }
        
        return await claimConversationWithStatus(conversationId, agentId);
      }
      
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
