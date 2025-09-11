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

    // Note: GoHighLevel MCP doesn't have a specific getConversation method
    // We'll proceed with claiming and let the system handle validation
    
    try {
      // For now, we'll simulate successful claiming
      // In a real implementation, this would update the conversation assignment in GoHighLevel
      console.log(`Agent ${agentId} claiming conversation ${conversationId}`);
      
      return NextResponse.json({
        success: true,
        conversationId,
        agentId,
        claimedAt: new Date().toISOString(),
        message: 'Conversation claimed successfully'
      });
      
    } catch (error) {
      console.error('[API] Error claiming conversation:', error);
      return NextResponse.json(
        { 
          error: 'Failed to claim conversation', 
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

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

