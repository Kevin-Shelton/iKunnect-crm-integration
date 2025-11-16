import { createClient } from '@supabase/supabase-js';
import { storeMessage, getMessages, getAllConversations } from './memory-storage';
import { 
  storeMessage as storeMessagePersistent,
  getConversationMessages as getConversationMessagesPersistent,
  getAllConversations as getAllConversationsPersistent,
  updateConversationStatus as updateConversationStatusPersistent,
  deleteConversation as deleteConversationPersistent
} from './persistent-storage';

// Use the correct environment variable names from Vercel
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;

// Check if we have valid Supabase configuration (not placeholder values)
const hasValidSupabaseConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseServiceKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key' &&
  supabaseServiceKey !== 'your-service-role-key';

// Validate environment variables
if (!hasValidSupabaseConfig) {
  console.warn('[Supabase] Using memory storage fallback - Supabase not configured or using placeholder values');
  console.warn('[Supabase] To use Supabase, set valid values for: SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_TOKEN, SUPABASE_SERVICE_ROLE_TOKEN');
}

// Client for browser use (public operations) - only create if we have valid config
export const supabase = hasValidSupabaseConfig 
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

// Service client for server-side operations (full access) - only create if we have valid config
export const supabaseService = hasValidSupabaseConfig 
  ? createClient(supabaseUrl!, supabaseServiceKey!)
  : null;

// Chat events table schema
export interface ChatEvent {
  id?: string;
  conversation_id: string;
  type: 'inbound' | 'agent_send' | 'ai_agent_send' | 'human_agent_send' | 'suggestions' | 'admin';
  message_id?: string;
  text?: string;
  customer_language?: string; // Customer's selected language (e.g., 'es', 'pt', 'fr')
  items?: Array<{
    text: string;
    reason?: string | null;
    confidence?: number | null;
    rank: number;
  }>;
  payload: Record<string, unknown>;
  created_at?: string;
}

// Helper to insert chat event
export async function insertChatEvent(event: ChatEvent) {
  // Use memory storage if Supabase is not available
  if (!supabaseService) {
    console.log('[Storage] Using memory storage for chat event');
    const storedMessage = storeMessage({
      conversation_id: event.conversation_id,
      type: event.type,
      message_id: event.message_id || `msg_${Date.now()}`,
      text: event.text || '',
      payload: event.payload
    });
    return storedMessage;
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .insert(event)
      .select()
      .single();
      
    if (error) {
      console.error('[Supabase Insert Error]', error);
      // Fallback to persistent storage on error
      console.log('[Storage] Falling back to persistent storage due to Supabase error');
      const storedMessage = await storeMessagePersistent({
        conversation_id: event.conversation_id,
        type: event.type,
        message_id: event.message_id || `msg_${Date.now()}`,
        text: event.text || '',
        payload: event.payload
      });
      return storedMessage;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase Insert Exception]', error);
    // Fallback to persistent storage on exception
    console.log('[Storage] Falling back to persistent storage due to Supabase exception');
    const storedMessage = await storeMessagePersistent({
      conversation_id: event.conversation_id,
      type: event.type,
      message_id: event.message_id || `msg_${Date.now()}`,
      text: event.text || '',
      payload: event.payload
    });
    return storedMessage;
  }
}

// Helper to get chat history
export async function getChatHistory(conversationId: string, limit = 20) {
  // Use persistent storage if Supabase is not available
  if (!supabaseService) {
    console.log('[Storage] Using persistent storage for chat history');
    return await getConversationMessagesPersistent(conversationId, limit);
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
      
    if (error) {
      console.error('[Supabase Query Error]', error);
      // Fallback to persistent storage on error
      console.log('[Storage] Falling back to persistent storage due to Supabase error');
      return await getConversationMessagesPersistent(conversationId, limit);
    }
    
    return data || [];
  } catch (error) {
    console.error('[Supabase Query Exception]', error);
    // Fallback to persistent storage on exception
    console.log('[Storage] Falling back to persistent storage due to Supabase exception');
    return await getConversationMessagesPersistent(conversationId, limit);
  }
}

// Helper to get all conversations
export async function getAllConversationsFromStorage() {
  // Use persistent storage if Supabase is not available
  if (!supabaseService) {
    console.log('[Storage] Using persistent storage for conversations list');
    return await getAllConversationsPersistent();
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .select('conversation_id, created_at, type, text, message_id')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('[Supabase Conversations Query Error]', error);
      // Fallback to persistent storage on error
      console.log('[Storage] Falling back to persistent storage due to Supabase error');
      return await getAllConversationsPersistent();
    }
    
    // Group by conversation and get latest message for each
    const conversationMap = new Map();
    (data || []).forEach(event => {
      if (!conversationMap.has(event.conversation_id)) {
        conversationMap.set(event.conversation_id, {
          id: event.conversation_id,
          messageCount: 1,
          lastMessage: event
        });
      } else {
        conversationMap.get(event.conversation_id).messageCount++;
      }
    });
    
    return Array.from(conversationMap.values());
  } catch (error) {
    console.error('[Supabase Conversations Query Exception]', error);
    // Fallback to persistent storage on exception
    console.log('[Storage] Falling back to persistent storage due to Supabase exception');
    return await getAllConversationsPersistent();
  }
}

// Helper to broadcast event to conversation channel
export async function broadcastToConversation(conversationId: string, token: string, event: Record<string, unknown>) {
  if (!supabase) {
    console.warn('[Supabase] Client not available, skipping broadcast');
    return 'error';
  }
  
  const channel = `conv:${conversationId}:${token}`;
  
  const broadcastResult = await supabase
    .channel(channel)
    .send({
      type: 'broadcast',
      event: 'event',
      payload: event
    });
    
  console.log('[Supabase Broadcast]', {
    channel,
    event: event.type,
    messageId: event.messageId,
    success: broadcastResult === 'ok'
  });
  
  return broadcastResult;
}
