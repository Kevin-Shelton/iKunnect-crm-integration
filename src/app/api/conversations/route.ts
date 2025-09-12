import { NextRequest, NextResponse } from 'next/server';
import { ConversationQueue, QueueStats } from '@/lib/types';
import chatStorage from '@/lib/chat-storage';

// Helper function to convert chat storage conversation to frontend format
function convertToFrontendFormat(conversation: any) {
  return {
    id: conversation.id,
    contactName: conversation.contact?.name || `Customer ${conversation.contactId.slice(-4)}`,
    lastMessage: conversation.lastMessageBody || '',
    lastMessageTime: conversation.lastMessageTime || conversation.updatedAt,
    unreadCount: conversation.unreadCount || 0,
    channel: 'chat' as const, // Default to chat since these come from chat events
    tags: conversation.tags || [],
    assignedTo: conversation.assignedTo || undefined,
    contactId: conversation.contactId,
    status: conversation.status === 'waiting' ? 'open' : 'open' // Map to frontend status
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all'; // waiting, assigned, all
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[API] Fetching conversations:', { bucket, agentId, limit });

    // Get conversations from chat events (this is our primary source now)
    console.log('[API] Getting chat events conversations...');
    const chatEventConversations = chatStorage.getAllConversationSummaries();
    
    console.log('[API] Chat events conversations:', {
      count: chatEventConversations.length,
      totalStoredConversations: chatStorage.getConversationCount()
    });

    // Convert to frontend format
    const allConversations = chatEventConversations.map(convertToFrontendFormat);

    // Categorize conversations
    const waiting = allConversations.filter(conv => !conv.assignedTo);
    const assigned = allConversations.filter(conv => conv.assignedTo);
    const agentAssigned = agentId ? assigned.filter(conv => conv.assignedTo === agentId) : [];

    console.log('[API] Conversation categories:', {
      waiting: waiting.length,
      assigned: assigned.length,
      agentAssigned: agentAssigned.length,
      total: allConversations.length
    });

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

    console.log('[API] Returning conversations:', {
      bucket,
      count: conversations.length,
      stats
    });

    return NextResponse.json({
      success: true,
      conversations,
      queue,
      stats,
      timestamp: new Date().toISOString(),
      debug: {
        mcpConnected: false,
        mcpDisabled: true,
        totalFromMcp: 0,
        totalFromChatEvents: chatEventConversations.length,
        totalCombined: allConversations.length,
        chatStorageConversations: chatStorage.getConversationCount(),
        bucket,
        agentId,
        source: allConversations.length > 0 ? 'chat_events' : 'none'
      }
    });

  } catch (error) {
    console.error('[API] Error fetching conversations:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while fetching conversations',
      details: error instanceof Error ? error.message : 'Unknown error',
      conversations: [],
      queue: { waiting: [], assigned: [], all: [] },
      stats: { waiting: 0, assigned: 0, total: 0 },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

