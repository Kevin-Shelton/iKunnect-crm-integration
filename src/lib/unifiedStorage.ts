// Unified storage system with Supabase persistence and in-memory fallback
// Works with both the conversations/messages schema and chat_events table
import { createClient } from '@supabase/supabase-js';
import type { NormalizedMessage } from './types';

interface StoredMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender: 'customer' | 'agent';
  timestamp: string;
  created_at?: string;
}

interface StoredConversation {
  id: string;
  customer_name: string;
  status: 'waiting' | 'assigned' | 'closed';
  assigned_agent?: string;
  last_activity: string;
  created_at?: string;
  updated_at?: string;
}

interface ConversationWithMessages extends StoredConversation {
  messages: StoredMessage[];
}

// Supabase client setup
let supabase: any = null;
let useSupabase = false;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
  
  if (supabaseUrl && supabaseKey && 
      supabaseUrl !== 'https://your-project.supabase.co' && 
      supabaseKey !== 'your-service-role-key') {
    supabase = createClient(supabaseUrl, supabaseKey);
    useSupabase = true;
    console.log('[UnifiedStorage] Using Supabase for persistent storage');
  } else {
    console.log('[UnifiedStorage] Supabase not configured, using in-memory storage');
  }
} catch (error) {
  console.log('[UnifiedStorage] Supabase initialization failed, using in-memory storage:', error);
}

// In-memory fallback storage
const memoryConversations = new Map<string, ConversationWithMessages>();

// Convert NormalizedMessage to StoredMessage
function normalizeToStored(msg: NormalizedMessage): StoredMessage {
  return {
    id: msg.id,
    conversation_id: msg.conversationId || '',
    text: msg.text || '',
    sender: msg.direction === 'inbound' ? 'customer' : 'agent',
    timestamp: msg.createdAt || new Date().toISOString()
  };
}

// Convert StoredMessage to NormalizedMessage
function storedToNormalized(msg: StoredMessage): NormalizedMessage {
  return {
    id: msg.id,
    conversationId: msg.conversation_id,
    direction: msg.sender === 'customer' ? 'inbound' : 'outbound',
    sender: msg.sender === 'customer' ? 'contact' : 'human_agent',
    category: 'chat',
    text: msg.text,
    createdAt: msg.timestamp,
    raw: {
      id: msg.id,
      direction: msg.sender === 'customer' ? 'inbound' : 'outbound',
      type: 29, // TYPE_LIVE_CHAT
      body: msg.text,
      conversationId: msg.conversation_id,
      dateAdded: msg.timestamp,
      source: 'webchat'
    }
  };
}

export async function addMessage(conversationId: string, message: NormalizedMessage): Promise<void> {
  const storedMessage = normalizeToStored(message);
  const timestamp = new Date().toISOString();
  
  try {
    if (useSupabase && supabase) {
      await storeInSupabase(conversationId, storedMessage, message);
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase storage failed, using memory fallback:', error);
  }
  
  // Always store in memory as backup/cache
  storeInMemory(conversationId, storedMessage);
  
  console.log(`[UnifiedStorage] Added message to conversation ${conversationId}:`, {
    messageId: message.id,
    text: message.text,
    storage: useSupabase ? 'supabase+memory' : 'memory-only'
  });
}

async function storeInSupabase(conversationId: string, message: StoredMessage, originalMessage: NormalizedMessage): Promise<void> {
  // Store in chat_events table (existing structure)
  await supabase
    .from('chat_events')
    .upsert({
      conversation_id: conversationId,
      message_id: message.id,
      type: message.sender === 'customer' ? 'inbound' : 'agent_send',
      text: message.text,
      created_at: message.timestamp,
      payload: originalMessage.raw || {},
      raw_payload: originalMessage.raw || {}
    }, {
      onConflict: 'message_id'
    });

  // Also try to store in conversations/messages tables if they exist
  try {
    // Check if conversations table exists and store there too
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();
      
    if (!existingConv) {
      await supabase
        .from('conversations')
        .insert({
          id: conversationId,
          customer_name: `Customer ${conversationId.slice(-4)}`,
          status: 'waiting',
          last_activity: message.timestamp
        });
    }
    
    // Store message in messages table
    await supabase
      .from('messages')
      .upsert({
        id: message.id,
        conversation_id: conversationId,
        text: message.text,
        sender: message.sender,
        timestamp: message.timestamp
      }, {
        onConflict: 'id'
      });
      
    // Update conversation last activity
    await supabase
      .from('conversations')
      .update({ 
        last_activity: message.timestamp
      })
      .eq('id', conversationId);
  } catch (tableError) {
    // Tables might not exist, that's okay - chat_events is the primary storage
    console.log('[UnifiedStorage] conversations/messages tables not available, using chat_events only');
  }
}

function storeInMemory(conversationId: string, message: StoredMessage): void {
  let conversation = memoryConversations.get(conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      customer_name: `Customer ${conversationId.slice(-4)}`,
      messages: [],
      last_activity: message.timestamp,
      status: 'waiting'
    };
    memoryConversations.set(conversationId, conversation);
  }
  
  // Check if message already exists to avoid duplicates
  const existingIndex = conversation.messages.findIndex(m => m.id === message.id);
  if (existingIndex >= 0) {
    conversation.messages[existingIndex] = message;
  } else {
    conversation.messages.push(message);
  }
  
  // Sort messages by timestamp
  conversation.messages.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  conversation.last_activity = message.timestamp;
}

export async function getConversations(): Promise<Array<{
  id: string;
  customerName: string;
  status: string;
  lastActivity: string;
  messageCount: number;
  assignedAgent?: string;
}>> {
  try {
    if (useSupabase && supabase) {
      return await getConversationsFromSupabase();
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase fetch failed, using memory fallback:', error);
  }
  
  return getConversationsFromMemory();
}

async function getConversationsFromSupabase(): Promise<Array<{
  id: string;
  customerName: string;
  status: string;
  lastActivity: string;
  messageCount: number;
  assignedAgent?: string;
}>> {
  // Try conversations table first
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select(`
        id,
        customer_name,
        status,
        last_activity,
        assigned_agent,
        messages (count)
      `)
      .order('last_activity', { ascending: false });
      
    if (conversations && conversations.length > 0) {
      return conversations.map((conv: any) => ({
        id: conv.id,
        customerName: conv.customer_name,
        status: conv.status,
        lastActivity: conv.last_activity,
        messageCount: conv.messages?.[0]?.count || 0,
        assignedAgent: conv.assigned_agent
      }));
    }
  } catch (error) {
    console.log('[UnifiedStorage] conversations table not available, using chat_events');
  }

  // Fallback to chat_events table
  const { data: chatEvents } = await supabase
    .from('chat_events')
    .select('*')
    .order('created_at', { ascending: false });

  // Group events by conversation
  const conversationMap = new Map();
  
  chatEvents?.forEach((event: any) => {
    const convId = event.conversation_id;
    
    if (!conversationMap.has(convId)) {
      conversationMap.set(convId, {
        id: convId,
        customerName: `Customer ${convId.slice(-4)}`,
        status: 'waiting',
        lastActivity: event.created_at,
        messageCount: 0,
        assignedAgent: undefined
      });
    }
    
    const conversation = conversationMap.get(convId);
    
    // Count messages
    if (event.type === 'inbound' || event.type === 'agent_send') {
      conversation.messageCount++;
    }
    
    // Update last activity
    if (event.created_at > conversation.lastActivity) {
      conversation.lastActivity = event.created_at;
    }
    
    // Update status based on message types
    if (event.type === 'agent_send') {
      conversation.status = 'assigned';
    }
  });

  return Array.from(conversationMap.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

function getConversationsFromMemory(): Array<{
  id: string;
  customerName: string;
  status: string;
  lastActivity: string;
  messageCount: number;
  assignedAgent?: string;
}> {
  return Array.from(memoryConversations.values())
    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
    .map(conv => ({
      id: conv.id,
      customerName: conv.customer_name,
      status: conv.status,
      lastActivity: conv.last_activity,
      messageCount: conv.messages.length,
      assignedAgent: conv.assigned_agent
    }));
}

export async function getConversationMessages(conversationId: string, limit = 25): Promise<{
  messages: NormalizedMessage[];
  contact: any;
  total: number;
}> {
  try {
    if (useSupabase && supabase) {
      return await getMessagesFromSupabase(conversationId, limit);
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase fetch failed, using memory fallback:', error);
  }
  
  return getMessagesFromMemory(conversationId, limit);
}

async function getMessagesFromSupabase(conversationId: string, limit: number): Promise<{
  messages: NormalizedMessage[];
  contact: any;
  total: number;
}> {
  // Try messages table first
  try {
    const { data: conversation } = await supabase
      .from('conversations')
      .select(`
        id,
        customer_name,
        messages (
          id,
          text,
          sender,
          timestamp
        )
      `)
      .eq('id', conversationId)
      .single();
      
    if (conversation && conversation.messages) {
      const sortedMessages = conversation.messages
        .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-limit);
      
      const messages = sortedMessages.map((msg: any) => storedToNormalized({
        id: msg.id,
        conversation_id: conversationId,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp
      }));
      
      const contact = {
        id: conversationId,
        name: conversation.customer_name,
        email: '',
        phone: '',
        locationId: ''
      };
      
      return { messages, contact, total: messages.length };
    }
  } catch (error) {
    console.log('[UnifiedStorage] messages table not available, using chat_events');
  }

  // Fallback to chat_events table
  const { data: chatEvents } = await supabase
    .from('chat_events')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
    
  if (!chatEvents || chatEvents.length === 0) {
    return {
      messages: [],
      contact: null,
      total: 0
    };
  }
  
  const messages = chatEvents
    .filter((event: any) => event.type === 'inbound' || event.type === 'agent_send')
    .map((event: any) => storedToNormalized({
      id: event.message_id || event.id,
      conversation_id: conversationId,
      text: event.text || '',
      sender: event.type === 'inbound' ? 'customer' : 'agent',
      timestamp: event.created_at
    }));
  
  const contact = {
    id: conversationId,
    name: `Customer ${conversationId.slice(-4)}`,
    email: '',
    phone: '',
    locationId: ''
  };
  
  return { messages, contact, total: messages.length };
}

function getMessagesFromMemory(conversationId: string, limit: number): {
  messages: NormalizedMessage[];
  contact: any;
  total: number;
} {
  const conversation = memoryConversations.get(conversationId);
  
  if (!conversation) {
    return {
      messages: [],
      contact: null,
      total: 0
    };
  }
  
  const messages = conversation.messages
    .slice(-limit)
    .map(msg => storedToNormalized(msg));
  
  const contact = {
    id: conversationId,
    name: conversation.customer_name,
    email: '',
    phone: '',
    locationId: ''
  };
  
  return {
    messages,
    contact,
    total: messages.length
  };
}

export async function updateConversationStatus(
  conversationId: string, 
  status: 'waiting' | 'assigned' | 'closed',
  agentId?: string
): Promise<void> {
  const timestamp = new Date().toISOString();
  
  try {
    if (useSupabase && supabase) {
      // Try to update conversations table
      try {
        await supabase
          .from('conversations')
          .update({ 
            status,
            assigned_agent: agentId,
            last_activity: timestamp
          })
          .eq('id', conversationId);
      } catch (error) {
        console.log('[UnifiedStorage] conversations table not available for status update');
      }
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase update failed, using memory fallback:', error);
  }
  
  // Update memory
  const conversation = memoryConversations.get(conversationId);
  if (conversation) {
    conversation.status = status;
    if (agentId) {
      conversation.assigned_agent = agentId;
    }
    conversation.last_activity = timestamp;
  }
  
  console.log(`[UnifiedStorage] Updated conversation ${conversationId} status to ${status}`);
}

export function getStorageInfo() {
  return {
    type: useSupabase ? 'supabase+memory' : 'memory-only',
    supabaseConfigured: useSupabase,
    memoryConversations: memoryConversations.size
  };
}

// Legacy compatibility functions for existing code
export function upsertMessages(conversationId: string, messages: NormalizedMessage[]) {
  messages.forEach(message => {
    addMessage(conversationId, message).catch(error => {
      console.error('[UnifiedStorage] Failed to add message:', error);
    });
  });
}

export function getConversation(id: string) {
  const conversation = memoryConversations.get(id);
  if (!conversation) {
    return { id, messages: [], suggestions: [], updatedAt: 0 };
  }
  
  return {
    id: conversation.id,
    messages: conversation.messages.map(msg => storedToNormalized(msg)),
    suggestions: [], // TODO: Implement suggestions storage
    updatedAt: new Date(conversation.last_activity).getTime()
  };
}

export function listConversations() {
  return Array.from(memoryConversations.values())
    .sort((a, b) => new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime())
    .map(c => ({
      id: c.id,
      updatedAt: new Date(c.last_activity).getTime(),
      messageCount: c.messages.length,
      suggestionCount: 0, // TODO: Implement suggestions
      lastText: c.messages.at(-1)?.text ?? ''
    }));
}

export function addSuggestions(conversationId: string, suggestions: string[]) {
  // TODO: Implement suggestions storage in unified system
  console.log(`[UnifiedStorage] Suggestions not yet implemented for conversation ${conversationId}:`, suggestions);
}

export function resetConversations() {
  memoryConversations.clear();
  console.log('[UnifiedStorage] Cleared memory conversations');
}
