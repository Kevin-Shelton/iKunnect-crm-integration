import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    
    const { agentId } = body;

    if (!agentId || typeof agentId !== 'string') {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const crmClient = createCRMClient();

    // First check if conversation exists and is not already assigned
    const conversationResult = await crmClient.getConversation(conversationId);
    
    if (!conversationResult.success) {
      return NextResponse.json(
        { error: 'Conversation not found', details: conversationResult.error },
        { status: 404 }
      );
    }

    const conversation = conversationResult.data;
    
    if (conversation?.assignedTo && conversation.assignedTo !== agentId) {
      return NextResponse.json(
        { error: 'Conversation is already assigned to another agent' },
        { status: 409 }
      );
    }

    // Assign the conversation to the agent
    const assignResult = await crmClient.assignConversation(conversationId, agentId);

    if (!assignResult.success) {
      return NextResponse.json(
        { error: 'Failed to claim conversation', details: assignResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      conversationId,
      agentId,
      message: 'Conversation claimed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error claiming conversation:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

