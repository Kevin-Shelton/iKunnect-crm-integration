import { NextRequest, NextResponse } from 'next/server';
import { claimConversation, getConversationStatus } from '@/lib/memory-storage';

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

    // Check if conversation exists
    const status = getConversationStatus(conversationId);
    if (!status) {
      console.log(`[Claim] Conversation ${conversationId} not found`);
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Attempt to claim the conversation
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
      console.log(`[Claim] Failed to claim conversation ${conversationId} - may already be assigned`);
      
      return NextResponse.json(
        { success: false, error: 'Conversation may already be assigned' },
        { status: 409 }
      );
    }

  } catch (error) {
    console.error('[Claim] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
