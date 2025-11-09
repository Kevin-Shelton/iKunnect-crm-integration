export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { listConversations } from '@/lib/chatStorage';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';

export async function GET(request: NextRequest) {
  const traceId = pickTrace(request.headers);
  
  try {
    const conversations = listConversations();
    
    const waiting = conversations.filter(c => !c.lastText.startsWith('agent:'));
    const assigned = conversations.filter(c => c.lastText.startsWith('agent:'));

    const response = {
      waiting,
      assigned,
      all: conversations
    };

    tapPush({
      t: nowIso(),
      route: '/api/conversations',
      traceId,
      note: 'list_conversations_from_memory',
      data: { 
        counts: { 
          waiting: waiting.length, 
          assigned: assigned.length, 
          total: conversations.length 
        } 
      }
    });

    return NextResponse.json(response);

  } catch (error) {
    tapPush({ 
      t: nowIso(), 
      route: '/api/conversations', 
      traceId, 
      note: 'error', 
      data: { error: String(error) } 
    });
    
    console.error('[Conversations API] Unexpected error:', error);
    return NextResponse.json({ 
      waiting: [], 
      assigned: [], 
      all: [] 
    });
  }
}
