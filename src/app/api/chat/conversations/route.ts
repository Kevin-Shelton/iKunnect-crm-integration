import { NextRequest, NextResponse } from 'next/server';
import { getConversations, getConversationMessages } from '@/lib/unifiedStorage';

export async function GET(request: NextRequest) {
  try {
    console.log('[Chat Conversations] Fetching conversations from unified storage');
    
    const conversations = await getConversations();
    console.log('[Chat Conversations] Got conversations:', conversations.length);
    
    // For each conversation, we need to get the messages to build the full structure
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const { messages } = await getConversationMessages(conv.id, 5); // Get last 5 messages for preview
          return {
            ...conv,
            messages: messages || []
          };
        } catch (error) {
          console.error(`[Chat Conversations] Error getting messages for ${conv.id}:`, error);
          return {
            ...conv,
            messages: []
          };
        }
      })
    );
    
    // Transform to Agent Desk format
    const waiting = conversationsWithMessages
      .filter(conv => conv.status === 'waiting')
      .map(conv => ({
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: conv.customerName,
        lastMessage: conv.messages[conv.messages.length - 1]?.text || '',
        timestamp: conv.lastActivity,
        unreadCount: conv.messages.filter(m => m.sender === 'contact').length,
        status: conv.status,
        priority: 'normal',
        tags: [],
        messages: conv.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp || msg.createdAt,
          type: msg.sender === 'contact' ? 'inbound' : 'outbound'
        }))
      }));
    
    const assigned = conversationsWithMessages
      .filter(conv => conv.status === 'assigned')
      .map(conv => ({
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: conv.customerName,
        lastMessage: conv.messages[conv.messages.length - 1]?.text || '',
        timestamp: conv.lastActivity,
        unreadCount: conv.messages.filter(m => m.sender === 'contact').length,
        status: conv.status,
        priority: 'normal',
        tags: [],
        assignedTo: conv.assignedAgent || 'Agent',
        messages: conv.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.timestamp || msg.createdAt,
          type: msg.sender === 'contact' ? 'inbound' : 'outbound'
        }))
      }));
    
    const all = [...waiting, ...assigned];
    
    console.log('[Chat Conversations] Returning from unified storage:', {
      waiting: waiting.length,
      assigned: assigned.length,
      total: all.length,
      conversations: conversations.map(c => ({ id: c.id, messageCount: c.messageCount, status: c.status }))
    });
    
    return NextResponse.json({
      waiting,
      assigned,
      all
    });
    
  } catch (error) {
    console.error('[Chat Conversations] Error:', error);
    return NextResponse.json({
      waiting: [],
      assigned: [],
      all: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
