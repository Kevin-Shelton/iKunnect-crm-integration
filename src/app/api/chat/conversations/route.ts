import { NextResponse } from 'next/server';
import { getConversations, getConversationMessages } from '@/lib/unifiedStorage';

export async function GET() {
  try {
    console.log('[Chat Conversations] Fetching conversations from unified storage');
    
    const conversations = await getConversations();
    console.log('[Chat Conversations] Got conversations:', conversations.length);
    
    // Get messages for each conversation to provide full context
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        const { messages } = await getConversationMessages(conv.id, 10);
        return {
          ...conv,
          messages
        };
      })
    );
    
    const waiting = conversationsWithMessages
      .filter(conv => conv.status === 'waiting')
      .map(conv => ({
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: conv.customerName,
        lastMessageBody: conv.lastMessageBody || conv.messages[conv.messages.length - 1]?.text || '',
        lastMessageDate: conv.lastActivity,
        unreadCount: conv.messages.filter(m => m.sender === 'contact').length,
        status: conv.status,
        priority: 'normal',
        tags: [],
        messages: conv.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.createdAt,
          type: msg.sender === 'contact' ? 'inbound' : 'outbound'
        }))
      }));
    
    const assigned = conversationsWithMessages
      .filter(conv => conv.status === 'assigned')
      .map(conv => ({
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: conv.customerName,
        lastMessageBody: conv.lastMessageBody || conv.messages[conv.messages.length - 1]?.text || '',
        lastMessageDate: conv.lastActivity,
        unreadCount: conv.messages.filter(m => m.sender === 'contact').length,
        status: conv.status,
        priority: 'normal',
        tags: [],
        assignedTo: conv.assignedAgent || 'Agent',
        messages: conv.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: msg.createdAt,
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
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
