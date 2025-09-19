import { createClient } from '@supabase/supabase-js';
import { getSecureConfig, validateConfig, isProductionConfig } from './secure-config';

// Get configuration from secure config system
const config = getSecureConfig();
const validation = validateConfig(config);

// Log configuration status (without exposing sensitive data)
console.log('[Supabase Secure] Configuration status:', {
  hasUrl: !!config.supabase.url,
  hasAnonKey: !!config.supabase.anonKey,
  hasServiceKey: !!config.supabase.serviceKey,
  isValid: validation.valid,
  isProduction: isProductionConfig(),
  issues: validation.issues
});

// Client for browser use (public operations)
export const supabase = (config.supabase.url && config.supabase.anonKey) 
  ? createClient(config.supabase.url, config.supabase.anonKey)
  : null;

// Service client for server-side operations (full access)
export const supabaseService = (config.supabase.url && config.supabase.serviceKey) 
  ? createClient(config.supabase.url, config.supabase.serviceKey)
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

// Mock data for when Supabase is not available
const mockChatEvents: ChatEvent[] = [
  {
    id: 'mock-1',
    conversation_id: 'demo-conv-001',
    type: 'inbound',
    message_id: 'msg-1',
    text: 'Hello, I need help with my account',
    payload: { source: 'mock' },
    created_at: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
  },
  {
    id: 'mock-2',
    conversation_id: 'demo-conv-001',
    type: 'agent_send',
    message_id: 'msg-2',
    text: 'Hi! I\'d be happy to help you with your account. What specific issue are you experiencing?',
    payload: { source: 'mock' },
    created_at: new Date(Date.now() - 240000).toISOString() // 4 minutes ago
  },
  {
    id: 'mock-3',
    conversation_id: 'demo-conv-001',
    type: 'inbound',
    message_id: 'msg-3',
    text: 'I can\'t log in to my dashboard. It keeps saying my password is incorrect.',
    payload: { source: 'mock' },
    created_at: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
  },
  {
    id: 'mock-4',
    conversation_id: 'demo-conv-002',
    type: 'inbound',
    message_id: 'msg-4',
    text: 'Is there a way to export my data?',
    payload: { source: 'mock' },
    created_at: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
  }
];

// Helper to insert chat event
export async function insertChatEvent(event: ChatEvent) {
  if (!supabaseService) {
    console.warn('[Supabase Secure] Service client not available, using mock storage');
    // In a real implementation, you might store in memory, local storage, or a different database
    const mockEvent = { ...event, id: `mock-${Date.now()}`, created_at: new Date().toISOString() };
    mockChatEvents.push(mockEvent);
    return mockEvent;
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .insert(event)
      .select()
      .single();
      
    if (error) {
      console.error('[Supabase Secure Insert Error]', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('[Supabase Secure] Insert failed, falling back to mock storage:', error);
    const mockEvent = { ...event, id: `mock-${Date.now()}`, created_at: new Date().toISOString() };
    mockChatEvents.push(mockEvent);
    return mockEvent;
  }
}

// Helper to get chat history
export async function getChatHistory(conversationId: string, limit = 20) {
  if (!supabaseService) {
    console.warn('[Supabase Secure] Service client not available, returning mock data');
    return mockChatEvents
      .filter(event => event.conversation_id === conversationId)
      .slice(-limit);
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
      
    if (error) {
      console.error('[Supabase Secure Query Error]', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[Supabase Secure] Query failed, falling back to mock data:', error);
    return mockChatEvents
      .filter(event => event.conversation_id === conversationId)
      .slice(-limit);
  }
}

// Helper to get all conversations with recent activity
export async function getActiveConversations(limit = 10) {
  if (!supabaseService) {
    console.warn('[Supabase Secure] Service client not available, returning mock conversations');
    const conversations = Array.from(new Set(mockChatEvents.map(e => e.conversation_id)))
      .map(id => ({
        id,
        lastMessage: mockChatEvents.filter(e => e.conversation_id === id).pop(),
        messageCount: mockChatEvents.filter(e => e.conversation_id === id).length
      }));
    return conversations.slice(0, limit);
  }
  
  try {
    const { data, error } = await supabaseService
      .from('chat_events')
      .select('conversation_id, created_at, text, type')
      .order('created_at', { ascending: false })
      .limit(limit * 5); // Get more to find unique conversations
      
    if (error) {
      console.error('[Supabase Secure Conversations Error]', error);
      throw error;
    }
    
    // Group by conversation and get the latest message for each
    const conversationMap = new Map();
    data?.forEach(event => {
      if (!conversationMap.has(event.conversation_id)) {
        conversationMap.set(event.conversation_id, {
          id: event.conversation_id,
          lastMessage: event,
          messageCount: 1
        });
      } else {
        conversationMap.get(event.conversation_id).messageCount++;
      }
    });
    
    return Array.from(conversationMap.values()).slice(0, limit);
  } catch (error) {
    console.error('[Supabase Secure] Conversations query failed, falling back to mock data:', error);
    const conversations = Array.from(new Set(mockChatEvents.map(e => e.conversation_id)))
      .map(id => ({
        id,
        lastMessage: mockChatEvents.filter(e => e.conversation_id === id).pop(),
        messageCount: mockChatEvents.filter(e => e.conversation_id === id).length
      }));
    return conversations.slice(0, limit);
  }
}

// Helper to broadcast event to conversation channel
export async function broadcastToConversation(conversationId: string, token: string, event: Record<string, unknown>) {
  if (!supabase) {
    console.warn('[Supabase Secure] Client not available, skipping broadcast');
    return 'error';
  }
  
  const channel = `conv:${conversationId}:${token}`;
  
  try {
    const broadcastResult = await supabase
      .channel(channel)
      .send({
        type: 'broadcast',
        event: 'event',
        payload: event
      });
      
    console.log('[Supabase Secure Broadcast]', {
      channel,
      event: event.type,
      messageId: event.messageId,
      success: broadcastResult === 'ok'
    });
    
    return broadcastResult;
  } catch (error) {
    console.error('[Supabase Secure] Broadcast failed:', error);
    return 'error';
  }
}

// Configuration status for debugging
export function getConfigurationStatus() {
  return {
    hasSupabase: !!supabase,
    hasSupabaseService: !!supabaseService,
    isProductionConfig: isProductionConfig(),
    validation,
    config: {
      hasUrl: !!config.supabase.url,
      hasAnonKey: !!config.supabase.anonKey,
      hasServiceKey: !!config.supabase.serviceKey,
      urlPreview: config.supabase.url ? config.supabase.url.substring(0, 30) + '...' : 'Not set'
    }
  };
}
