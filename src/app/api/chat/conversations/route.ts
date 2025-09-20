import { NextResponse } from 'next/server';
import { getAllConversationsWithStatus, initializeConversationStatus } from '@/lib/supabase-conversations';

// Extract customer name from conversation data
function extractCustomerNameFromConversation(conv: any): string {
  // Try to extract name from the last message or conversation data
  const lastMessageText = conv.lastMessage?.text || '';
  
  // Look for name patterns in the message
  const namePatterns = [
    /my name is ([a-zA-Z\s]+)/i,
    /i'm ([a-zA-Z\s]+)/i,
    /i am ([a-zA-Z\s]+)/i,
    /this is ([a-zA-Z\s]+)/i,
    /call me ([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = lastMessageText.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length >= 2 && name.length <= 30 && /^[a-zA-Z\s]+$/.test(name)) {
        return capitalizeWords(name);
      }
    }
  }
  
  // Fallback to visitor pattern with last 4 digits
  return `Visitor ${conv.id.slice(-4)}`;
}

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function GET() {
  try {
    console.log('[Conversations] Starting Supabase-based conversation fetch...');
    
    // Initialize conversation status table if needed
    await initializeConversationStatus();

    // Get all conversations with their status from Supabase
    const conversations = await getAllConversationsWithStatus();
    
    console.log('[Conversations] Retrieved conversations from Supabase:', {
      count: conversations.length,
      conversations: conversations.slice(0, 3).map(c => ({
        id: c.id,
        messageCount: c.messageCount,
        status: c.status?.status || 'waiting',
        lastMessageText: c.lastMessage?.text?.substring(0, 30)
      }))
    });

    // Transform to expected format for the UI
    const transformedConversations = conversations.map(conv => {
      // Extract customer name from conversation data
      const customerName = extractCustomerNameFromConversation(conv);
      
      return {
        id: conv.id,
        contactId: `contact_${conv.id}`,
        contactName: customerName,
        lastMessageBody: conv.lastMessage?.text || '',
        lastMessageDate: conv.lastMessage?.created_at || new Date().toISOString(),
        unreadCount: conv.messageCount,
        status: conv.status?.status || 'waiting',
        agentId: conv.status?.agent_id,
        claimedAt: conv.status?.claimed_at,
        rejectedAt: conv.status?.rejected_at,
        rejectedBy: conv.status?.rejected_by,
        rejectionReason: conv.status?.rejection_reason,
        passedAt: conv.status?.passed_at,
        passedBy: conv.status?.passed_by,
        restoredAt: conv.status?.restored_at,
        restoredBy: conv.status?.restored_by,
        priority: 'normal',
        tags: [],
        messages: []
      };
    });

    // Sort by most recent
    const sortedConversations = transformedConversations
      .sort((a, b) => new Date(b.lastMessageDate).getTime() - new Date(a.lastMessageDate).getTime());

    // Group by status
    const waiting = sortedConversations.filter(conv => conv.status === 'waiting');
    const assigned = sortedConversations.filter(conv => conv.status === 'assigned');
    const rejected = sortedConversations.filter(conv => conv.status === 'rejected');

    console.log('[Conversations] Returning Supabase conversations:', {
      waiting: waiting.length,
      assigned: assigned.length,
      rejected: rejected.length,
      total: sortedConversations.length
    });

    return NextResponse.json({
      waiting,
      assigned,
      rejected,
      all: sortedConversations
    });

  } catch (error) {
    console.error('[Conversations] Supabase error:', error);
    return NextResponse.json({
      waiting: [],
      assigned: [],
      rejected: [],
      all: [],
      error: `Supabase error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }, { status: 500 });
  }
}
