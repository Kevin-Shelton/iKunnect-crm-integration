import { NextRequest, NextResponse } from 'next/server';
import { ChatEventStorage } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all'; // waiting, assigned, all
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[API] Fetching conversations from events:', { bucket, agentId, limit });

    // Get all conversations from chat events storage
    const allConversations = ChatEventStorage.getAllConversations();
    const stats = ChatEventStorage.getStats();

    console.log('[API] Found conversations from events:', {
      total: allConversations.length,
      stats
    });

    // Transform to match the expected conversation format
    const transformedConversations = allConversations.map(conv => ({
      id: conv.conversationId,
      contactName: `Customer ${conv.contactId.slice(-4)}`, // Use last 4 chars of contact ID
      lastMessage: conv.lastMessage,
      lastMessageTime: conv.lastMessageTime,
      unreadCount: conv.status === 'waiting' ? 1 : 0,
      channel: 'chat' as const,
      tags: [],
      assignedTo: conv.assignedAgent,
      status: conv.status === 'closed' ? 'closed' : 'open',
      contactId: conv.contactId,
      waitTime: Math.floor((Date.now() - new Date(conv.lastMessageTime).getTime()) / (1000 * 60)),
      originalStatus: conv.status // Keep original status for debugging
    }));

    // Categorize conversations - use original status for better categorization
    const waiting = transformedConversations.filter(conv => 
      conv.status === 'open' && (conv.originalStatus === 'waiting' || !conv.assignedTo)
    );
    const assigned = transformedConversations.filter(conv => 
      conv.status === 'open' && conv.assignedTo && conv.originalStatus !== 'waiting'
    );
    const agentAssigned = agentId ? assigned.filter(conv => conv.assignedTo === agentId) : [];

    console.log('[API] Conversation categories from events:', {
      waiting: waiting.length,
      assigned: assigned.length,
      agentAssigned: agentAssigned.length
    });

    // Prepare queue data
    const queue = {
      waiting: waiting.slice(0, limit),
      assigned: agentId ? agentAssigned.slice(0, limit) : assigned.slice(0, limit),
      all: transformedConversations.filter(conv => conv.status === 'open').slice(0, limit)
    };

    const queueStats = {
      waiting: waiting.length,
      assigned: assigned.length,
      total: transformedConversations.filter(conv => conv.status === 'open').length
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

    console.log('[API] Returning conversations from events:', {
      bucket,
      count: conversations.length,
      stats: queueStats
    });

    return NextResponse.json({
      success: true,
      conversations,
      queue,
      stats: queueStats,
      timestamp: new Date().toISOString(),
      debug: {
        source: 'chat_events_storage',
        totalFromStorage: allConversations.length,
        bucket,
        agentId,
        storageStats: stats
      }
    });

  } catch (error) {
    console.error('[API] Error fetching conversations from events:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching conversations from events',
      details: error instanceof Error ? error.message : 'Unknown error',
      conversations: [],
      queue: { waiting: [], assigned: [], all: [] },
      stats: { waiting: 0, assigned: 0, total: 0 },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

