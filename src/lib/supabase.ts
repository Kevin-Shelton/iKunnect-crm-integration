import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Client for browser use (public operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Service client for server-side operations (full access)
export const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

// Chat events table schema
export interface ChatEvent {
  id?: string;
  conversation_id: string;
  type: 'inbound' | 'agent_send' | 'suggestions' | 'admin';
  message_id?: string;
  text?: string;
  items?: Array<{
    text: string;
    reason?: string | null;
    confidence?: number | null;
    rank: number;
  }>;
  payload: any;
  created_at?: string;
}

// Helper to insert chat event
export async function insertChatEvent(event: ChatEvent) {
  const { data, error } = await supabaseService
    .from('chat_events')
    .insert(event)
    .select()
    .single();
    
  if (error) {
    console.error('[Supabase Insert Error]', error);
    throw error;
  }
  
  return data;
}

// Helper to get chat history
export async function getChatHistory(conversationId: string, limit = 20) {
  const { data, error } = await supabaseService
    .from('chat_events')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
    
  if (error) {
    console.error('[Supabase Query Error]', error);
    throw error;
  }
  
  return data || [];
}

// Helper to broadcast event to conversation channel
export async function broadcastToConversation(conversationId: string, token: string, event: any) {
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

