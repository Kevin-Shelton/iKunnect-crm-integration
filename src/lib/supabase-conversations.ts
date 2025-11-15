import { supabaseService } from './supabase';

export interface ConversationStatus {
  conversation_id: string;
  status: 'waiting' | 'assigned' | 'rejected' | 'passed';
  agent_id?: string;
  claimed_at?: string;
  rejected_at?: string;
  rejected_by?: string;
  rejection_reason?: string;
  passed_at?: string;
  passed_by?: string;
  restored_at?: string;
  restored_by?: string;
  created_at?: string;
  updated_at?: string;
}

// Ensure conversation_status table exists and create if needed
export async function ensureConversationStatusTable() {
  if (!supabaseService) {
    throw new Error('Supabase service not available');
  }

  try {
    // Try to create the table (will fail silently if it already exists)
    const { error } = await supabaseService.rpc('create_conversation_status_table_if_not_exists');
    
    if (error && !error.message.includes('already exists')) {
      console.warn('[Supabase] Could not create conversation_status table:', error);
    }
  } catch (error) {
    console.warn('[Supabase] Table creation check failed:', error);
  }
}

// Get conversation status from Supabase
export async function getConversationStatus(conversationId: string): Promise<ConversationStatus | null> {
  if (!supabaseService) {
    throw new Error('Supabase service not available');
  }

  const { data, error } = await supabaseService
    .from('conversation_status')
    .select('*')
    .eq('conversation_id', conversationId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('[Supabase] Error getting conversation status:', error);
    return null;
  }

  return data;
}

// Update conversation status in Supabase
export async function updateConversationStatus(
  conversationId: string, 
  status: 'waiting' | 'assigned' | 'rejected' | 'passed',
  metadata: {
    agentId?: string;
    rejectionReason?: string;
    rejectedBy?: string;
    passedBy?: string;
    restoredBy?: string;
  } = {}
): Promise<boolean> {
  if (!supabaseService) {
    throw new Error('Supabase service not available');
  }

  try {
    const now = new Date().toISOString();
    const statusData: Partial<ConversationStatus> = {
      conversation_id: conversationId,
      status,
      updated_at: now
    };

    // Add status-specific fields
    switch (status) {
      case 'assigned':
        statusData.agent_id = metadata.agentId;
        statusData.claimed_at = now;
        break;
      case 'rejected':
        statusData.rejected_at = now;
        statusData.rejected_by = metadata.rejectedBy || metadata.agentId;
        statusData.rejection_reason = metadata.rejectionReason || 'No reason provided';
        break;
      case 'passed':
        statusData.passed_at = now;
        statusData.passed_by = metadata.passedBy || metadata.agentId;
        break;
      case 'waiting':
        if (metadata.restoredBy) {
          statusData.restored_at = now;
          statusData.restored_by = metadata.restoredBy;
        }
        break;
    }

    // Use upsert to insert or update
    const { error } = await supabaseService
      .from('conversation_status')
      .upsert(statusData, { 
        onConflict: 'conversation_id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('[Supabase] Error updating conversation status:', error);
      return false;
    }

    console.log(`[Supabase] Updated conversation ${conversationId} to status: ${status}`);
    return true;
  } catch (error) {
    console.error('[Supabase] Exception updating conversation status:', error);
    return false;
  }
}

// Get all conversations with their status from Supabase
export async function getAllConversationsWithStatus() {
  if (!supabaseService) {
    throw new Error('Supabase service not available');
  }

  try {
    // Get all chat events to build conversation list
    const { data: events, error: eventsError } = await supabaseService
      .from('chat_events')
      .select('conversation_id, created_at, type, text, message_id, payload')
      .order('created_at', { ascending: false });

    if (eventsError) {
      console.error('[Supabase] Error getting chat events:', eventsError);
      return [];
    }

    // Group by conversation and get latest message for each
    const conversationMap = new Map();
    (events || []).forEach(event => {
      // Extract contact info from payload
      const payload = event.payload as any;
      const contact = payload?.contact || {};
      const contactId = contact?.id || payload?.contactId || null;
      const contactName = contact?.name || null;
      const contactEmail = contact?.email || null;
      const contactPhone = contact?.phone || null;
      
      if (!conversationMap.has(event.conversation_id)) {
        conversationMap.set(event.conversation_id, {
          id: event.conversation_id,
          messageCount: 1,
          lastMessage: event,
          contact_id: contactId,
          customer_name: contactName,
          customer_email: contactEmail,
          customer_phone: contactPhone
        });
      } else {
        const conv = conversationMap.get(event.conversation_id);
        conv.messageCount++;
        // Update contact info if this event has it and current doesn't
        if (contactName && !conv.customer_name) {
          conv.customer_name = contactName;
        }
        if (contactEmail && !conv.customer_email) {
          conv.customer_email = contactEmail;
        }
        if (contactPhone && !conv.customer_phone) {
          conv.customer_phone = contactPhone;
        }
        if (contactId && !conv.contact_id) {
          conv.contact_id = contactId;
        }
      }
    });

    const conversations = Array.from(conversationMap.values());

    // Get status for all conversations
    const { data: statuses, error: statusError } = await supabaseService
      .from('conversation_status')
      .select('*');

    if (statusError) {
      console.warn('[Supabase] Error getting conversation statuses:', statusError);
      // Continue without status data
    }

    // Merge status data with conversations
    const statusMap = new Map();
    (statuses || []).forEach(status => {
      statusMap.set(status.conversation_id, status);
    });

    return conversations.map(conv => ({
      ...conv,
      status: statusMap.get(conv.id) || { status: 'waiting' }
    }));

  } catch (error) {
    console.error('[Supabase] Exception getting conversations with status:', error);
    return [];
  }
}

// Initialize conversation status table on first use
let tableInitialized = false;
export async function initializeConversationStatus() {
  if (!tableInitialized && supabaseService) {
    await ensureConversationStatusTable();
    tableInitialized = true;
  }
}
