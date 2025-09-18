import { NextRequest, NextResponse } from 'next/server';
import { getConversation, updateConversationStatus } from '@/lib/unifiedStorage';

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

    // Get the conversation from unified storage
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      console.log(`[Claim] Conversation ${conversationId} not found in unified storage`);
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Update conversation status to assigned
    const updatedConversation = await updateConversationStatus(conversationId, 'assigned', agentId);

    console.log(`[Claim] Conversation ${conversationId} claimed by ${agentId} via unified storage`);

    return NextResponse.json({
      success: true,
      conversation: updatedConversation,
      message: 'Conversation claimed successfully'
    });

  } catch (error) {
    console.error('[Claim] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
