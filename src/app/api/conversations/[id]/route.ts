export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { getConversation } from '@/lib/chatStorage';
import { pickTrace, nowIso } from '@/lib/trace';
import { tapPush } from '@/lib/ring';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const traceId = pickTrace(request.headers);
  const { id: conversationId } = await params;
  
  try {
    // Get conversation from new storage system
    const conversation = getConversation(conversationId);
    
    // Transform to match expected format
    const response = {
      conversation: {
        id: conversation.id,
        messages: conversation.messages || [],
        suggestions: conversation.suggestions || [],
        updatedAt: conversation.updatedAt
      }
    };

    // Log for debugging
    tapPush({
      t: nowIso(),
      route: '/api/conversations/[id]',
      traceId,
      note: `get_conversation ${conversationId}`,
      data: { 
        conversationId, 
        counts: { 
          messages: conversation.messages.length, 
          suggestions: conversation.suggestions.length 
        } 
      }
    });

    console.log('[Desk]', traceId, 'conversation', 'id=', conversationId, 'msg=', conversation.messages.length, 'sugg=', conversation.suggestions.length);

    return NextResponse.json(response);
  } catch (error) {
    tapPush({ t: nowIso(), route: '/api/conversations/[id]', traceId, note: 'error', data: { conversationId, error: String(error) } });
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ 
      conversation: {
        id: conversationId,
        messages: [],
        suggestions: [],
        updatedAt: 0
      }
    });
  }
}

