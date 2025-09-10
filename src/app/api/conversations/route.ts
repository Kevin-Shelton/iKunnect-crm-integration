import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import { ConversationQueue, QueueStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all'; // waiting, assigned, all
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    const crmClient = createCRMClient();

    // Get all open conversations
    const allConversationsResult = await crmClient.getAllConversations({
      limit: limit * 3, // Get more to filter locally
      status: 'open'
    });

    if (!allConversationsResult.success) {
      return NextResponse.json(
        { error: 'Failed to fetch conversations', details: allConversationsResult.error },
        { status: 500 }
      );
    }

    const allConversations = allConversationsResult.data?.items || [];

    // Categorize conversations
    const waiting = allConversations.filter(conv => !conv.assignedTo);
    const assigned = allConversations.filter(conv => conv.assignedTo);
    const agentAssigned = agentId ? assigned.filter(conv => conv.assignedTo === agentId) : [];

    // Prepare queue data
    const queue: ConversationQueue = {
      waiting: waiting.slice(0, limit),
      assigned: agentId ? agentAssigned.slice(0, limit) : assigned.slice(0, limit),
      all: allConversations.slice(0, limit)
    };

    const stats: QueueStats = {
      waiting: waiting.length,
      assigned: assigned.length,
      total: allConversations.length
    };

    // Return based on requested bucket
    let conversations;
    switch (bucket) {
      case 'waiting':
        conversations = queue.waiting;
        break;
      case 'assigned':
        conversations = queue.assigned;
        break;
      default:
        conversations = queue.all;
    }

    return NextResponse.json({
      success: true,
      conversations,
      queue,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[API] Error fetching conversations:', error);
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

