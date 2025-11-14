import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Security: Require admin key
    const authHeader = request.headers.get('authorization');
    const adminKey = process.env.ADMIN_API_KEY;
    
    if (!adminKey || authHeader !== `Bearer ${adminKey}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ 
        error: 'Supabase not configured' 
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get query parameter for dry run
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get('dryRun') !== 'false'; // Default to true

    console.log('[Cleanup] Starting junk conversation cleanup (dry run:', dryRun, ')');

    // Step 1: Identify junk conversations
    const { data: junkConversations, error: queryError } = await supabase
      .from('chat_events')
      .select('conversation_id, created_at, text, payload')
      .like('conversation_id', 'conv_%')
      .or('payload->>contactId.like.contact_conv_%,payload->>contactId.is.null,payload->contact->>id.like.contact_conv_%,payload->contact->>id.is.null');

    if (queryError) {
      console.error('[Cleanup] Error querying junk conversations:', queryError);
      return NextResponse.json({ 
        error: 'Query failed',
        details: queryError.message 
      }, { status: 500 });
    }

    // Group by conversation_id
    const conversationGroups = new Map<string, any[]>();
    junkConversations?.forEach(event => {
      if (!conversationGroups.has(event.conversation_id)) {
        conversationGroups.set(event.conversation_id, []);
      }
      conversationGroups.get(event.conversation_id)!.push(event);
    });

    const summary = {
      totalJunkConversations: conversationGroups.size,
      totalJunkMessages: junkConversations?.length || 0,
      conversations: Array.from(conversationGroups.entries()).map(([id, events]) => ({
        conversationId: id,
        messageCount: events.length,
        firstMessage: events[0]?.created_at,
        lastMessage: events[events.length - 1]?.created_at,
        sampleText: events[0]?.text?.substring(0, 100)
      }))
    };

    console.log('[Cleanup] Found junk conversations:', summary);

    if (dryRun) {
      return NextResponse.json({
        status: 'dry_run',
        message: 'Dry run completed - no records deleted',
        summary,
        note: 'To actually delete, call with ?dryRun=false'
      });
    }

    // Step 2: Delete junk conversations (only if dryRun=false)
    const conversationIds = Array.from(conversationGroups.keys());
    
    const { error: deleteError, count } = await supabase
      .from('chat_events')
      .delete()
      .in('conversation_id', conversationIds);

    if (deleteError) {
      console.error('[Cleanup] Error deleting junk conversations:', deleteError);
      return NextResponse.json({ 
        error: 'Delete failed',
        details: deleteError.message,
        summary 
      }, { status: 500 });
    }

    // Step 3: Clean up conversation_status table
    const { error: statusDeleteError } = await supabase
      .from('conversation_status')
      .delete()
      .in('conversation_id', conversationIds);

    if (statusDeleteError) {
      console.warn('[Cleanup] Error deleting conversation_status:', statusDeleteError);
    }

    console.log('[Cleanup] Deleted', count, 'junk messages from', conversationGroups.size, 'conversations');

    return NextResponse.json({
      status: 'success',
      message: 'Junk conversations deleted',
      deleted: {
        conversations: conversationGroups.size,
        messages: count
      },
      summary
    });

  } catch (error) {
    console.error('[Cleanup] Error:', error);
    return NextResponse.json({ 
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/cleanup-junk-conversations',
    method: 'POST',
    description: 'Clean up junk "Visitor XXXX" conversations created without proper contact info',
    authentication: 'Bearer token required (ADMIN_API_KEY)',
    parameters: {
      dryRun: 'Set to false to actually delete records (default: true)'
    },
    example: 'POST /api/admin/cleanup-junk-conversations?dryRun=false'
  });
}
