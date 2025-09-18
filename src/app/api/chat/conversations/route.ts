import { NextRequest, NextResponse } from 'next/server';
import { getConversations } from '@/lib/simpleStorage';

export async function GET(request: NextRequest) {
  try {
    console.log('[Chat Conversations] Fetching conversations');
    
    const conversations = getConversations();
    
    // Transform to Agent Desk format
    const waiting = conversations
      .filter(conv => conv.status === 'waiting')
      .map(conv => ({
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: conv.customerName,
        lastMessage: conv.messages[conv.messages.length - 1]?.text || '',
        timestamp: conv.lastActivity,
        unreadCount: conv.messages.filter(m => m.sender === 'customer').length,
        status: conv.status,
        priority: 'normal',
        tags: [],
        messages: conv.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender === 'customer' ? 'contact' : 'agent',
          timestamp: msg.timestamp,
          type: msg.sender === 'customer' ? 'inbound' : 'outbound'
        }))
      }));
    
    const assigned = conversations.filter(conv => conv.status === 'active');
    const all = [...waiting, ...assigned];
    
    console.log('[Chat Conversations] Returning:', {
      waiting: waiting.length,
      assigned: assigned.length,
      total: all.length
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

