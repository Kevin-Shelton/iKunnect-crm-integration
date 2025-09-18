import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_TOKEN;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}
if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_TOKEN environment variable');
}
if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_TOKEN environment variable');
}

// Client for browser use (public operations) - only create if we have the required vars
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Service client for server-side operations (full access) - only create if we have the required vars
export const supabaseService = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

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
  payload: Record<string, unknown>;
  created_at?: string;
}

// Helper to insert chat event
export async function insertChatEvent(event: ChatEvent) {
  if (!supabaseService) {
    console.warn('[Supabase] Service client not available, skipping insert');
    return null;
  }
  
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
  if (!supabaseService) {
    console.warn('[Supabase] Service client not available, returning empty history');
    return [];
  }
  
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

