import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import { ConversationQueue, QueueStats } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all'; // waiting, assigned, all
    const agentId = searchParams.get('agentId');
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('[API] Fetching conversations:', { bucket, agentId, limit });

    const crmClient = createCRMClient();

    // Test MCP connection first
    try {
      const healthCheck = await crmClient.healthCheck();
      console.log('[API] MCP Health Check:', healthCheck);
    } catch (healthError) {
      console.error('[API] MCP Health Check Failed:', healthError);
    }

    // Get all open conversations
    console.log('[API] Calling getAllConversations...');
    const allConversationsResult = await crmClient.getAllConversations({
      limit: limit * 3, // Get more to filter locally
      status: 'open'
    });

    console.log('[API] MCP Response:', {
      success: allConversationsResult.success,
      dataExists: !!allConversationsResult.data,
      itemCount: allConversationsResult.data?.items?.length || 0,
      error: allConversationsResult.error
    });

    if (!allConversationsResult.success) {
      console.error('[API] MCP Error:', allConversationsResult.error);
      
      // Return mock data as fallback
      const mockConversations = [
        {
          id: 'mock_001',
          contactId: 'contact_001',
          contactName: 'Test Customer',
          lastMessage: 'This is a test message from the chat widget',
          lastMessageTime: new Date().toISOString(),
          channel: 'web',
          status: 'waiting',
          assignedTo: undefined,
          unreadCount: 1,
          tags: ['test', 'widget'],
          priority: 'normal',
          locationId: process.env.GHL_LOCATION_ID || 'default_location'
        }
      ];

      const mockQueue: ConversationQueue = {
        waiting: mockConversations,
        assigned: [],
        all: mockConversations
      };

      const mockStats: QueueStats = {
        waiting: 1,
        assigned: 0,
        total: 1
      };

      return NextResponse.json({
        success: true,
        conversations: mockConversations,
        queue: mockQueue,
        stats: mockStats,
        timestamp: new Date().toISOString(),
        fallback: true,
        mcpError: allConversationsResult.error
      });
    }

    const allConversations = allConversationsResult.data?.items || [];
    console.log('[API] Processing conversations:', allConversations.length);

    // If no conversations from MCP, check for recent widget conversations
    if (allConversations.length === 0) {
      console.log('[API] No conversations from MCP, checking for widget conversations...');
      
      // Try to get recent conversations including closed ones
      try {
        const recentResult = await crmClient.getAllConversations({
          limit: 20,
          // Don't filter by status to get all recent conversations
        });
        
        console.log('[API] Recent conversations check:', {
          success: recentResult.success,
          count: recentResult.data?.items?.length || 0
        });

        if (recentResult.success && recentResult.data?.items?.length > 0) {
          const recentConversations = recentResult.data.items;
          console.log('[API] Found recent conversations:', recentConversations.map(c => ({
            id: c.id,
            status: c.status,
            lastMessage: c.lastMessage,
            assignedTo: c.assignedTo
          })));
        }
      } catch (recentError) {
        console.error('[API] Error checking recent conversations:', recentError);
      }
    }

    // Categorize conversations
    const waiting = allConversations.filter(conv => !conv.assignedTo);
    const assigned = allConversations.filter(conv => conv.assignedTo);
    const agentAssigned = agentId ? assigned.filter(conv => conv.assignedTo === agentId) : [];

    console.log('[API] Conversation categories:', {
      waiting: waiting.length,
      assigned: assigned.length,
      agentAssigned: agentAssigned.length
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
        mcpConnected: true,
        totalFromMcp: allConversations.length,
        bucket,
        agentId
      }
    });

  } catch (error) {
    console.error('[API] Error fetching conversations:', error);
    
    // Return mock data as fallback for any error
    const mockConversations = [
      {
        id: 'error_fallback_001',
        contactId: 'contact_error',
        contactName: 'Connection Test',
        lastMessage: 'MCP connection error - this is fallback data',
        lastMessageTime: new Date().toISOString(),
        channel: 'web',
        status: 'waiting',
        assignedTo: undefined,
        unreadCount: 1,
        tags: ['error', 'fallback'],
        priority: 'high',
        locationId: process.env.GHL_LOCATION_ID || 'default_location'
      }
    ];

    return NextResponse.json({
      success: true,
      conversations: mockConversations,
      queue: {
        waiting: mockConversations,
        assigned: [],
        all: mockConversations
      },
      stats: {
        waiting: 1,
        assigned: 0,
        total: 1
      },
      timestamp: new Date().toISOString(),
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

