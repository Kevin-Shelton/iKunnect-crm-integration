export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { listConversations } from '@/lib/chatStorage';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';

export async function GET(request: NextRequest) {
  const traceId = pickTrace(request.headers);
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const bucket = searchParams.get('bucket') || 'all';
    
    // Get conversations from new storage system
    const conversations = listConversations();
    
    // Transform to match expected format
    const waiting = conversations.filter(c => c.messageCount > 0).map(c => ({
      id: c.id,
      contactId: `contact_${c.id}`,
      contactName: `Customer ${c.id.slice(-4)}`,
      lastMessage: c.lastText || 'No messages',
      timestamp: new Date(c.updatedAt).toISOString(),
      unreadCount: 0,
      status: 'waiting' as const,
      priority: 'normal' as const,
      tags: [] as string[]
    }));

    const response = {
      waiting,
      assigned: [] as any[],
      all: waiting
    };

    // Log counts for debugging
    tapPush({
      t: nowIso(),
      route: '/api/conversations',
      traceId,
      note: `list_conversations`,
      data: { 
        bucket, 
        counts: { 
          waiting: waiting.length, 
          assigned: 0, 
          total: waiting.length 
        } 
      }
    });

    console.log('[Desk]', traceId, 'conversations', 'bucket=', bucket, 'count=', waiting.length);

    return NextResponse.json(response);
  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/conversations', traceId, note: 'error', data: { error: String(error) } });
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ 
      waiting: [], 
      assigned: [], 
      all: [] 
    });
  }
}

