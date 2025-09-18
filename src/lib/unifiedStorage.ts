export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import type { NormalizedMessage } from './types';

// Storage interfaces
interface StoredMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender: string;
  timestamp: string;
}

// ConversationWithMessages interface is imported from memoryStorageSingleton

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;

let supabase: any = null;
let useSupabase = false;

// Initialize Supabase if credentials are available
try {
  if (supabaseUrl && supabaseServiceKey) {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    useSupabase = true;
    console.log('[UnifiedStorage] Supabase initialized successfully');
  } else {
    console.log('[UnifiedStorage] Supabase credentials not found, using in-memory storage only');
  }
} catch (error) {
  console.log('[UnifiedStorage] Supabase initialization failed, using in-memory storage:', error);
}

// Import singleton memory storage
import { 
  getConversationFromMemory, 
  setConversationInMemory, 
  getAllConversationsFromMemory,
  getMemoryStorageStats,
  type ConversationWithMessages
} from './memoryStorageSingleton';

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
      dateAdded: msg.timestamp
    }
  };
}

export async function addMessage(conversationId: string, message: NormalizedMessage): Promise<void> {
  const storedMessage = normalizeToStored(message);
  
  // Try Supabase first if available
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
      
  } catch (error) {
    console.log('[UnifiedStorage] conversations/messages tables not available, using chat_events only');
  }
}

function storeInMemory(conversationId: string, message: StoredMessage): void {
  console.log(`[UnifiedStorage] Storing message in memory for conversation: ${conversationId}`);
  let conversation = getConversationFromMemory(conversationId);
  if (!conversation) {
    console.log(`[UnifiedStorage] Creating new conversation in memory: ${conversationId}`);
    conversation = {
      id: conversationId,
      customer_name: `Customer ${conversationId.slice(-4)}`,
      messages: [],
      last_activity: message.timestamp,
      status: 'waiting'
    };
    setConversationInMemory(conversationId, conversation);
  }
  
  // Check if message already exists to avoid duplicates
  const existingIndex = conversation.messages.findIndex(m => m.id === message.id);
  if (existingIndex >= 0) {
    console.log(`[UnifiedStorage] Updating existing message: ${message.id}`);
    conversation.messages[existingIndex] = message;
  } else {
    console.log(`[UnifiedStorage] Adding new message: ${message.id}`);
    conversation.messages.push(message);
  }
  
  // Sort messages by timestamp
  conversation.messages.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  conversation.last_activity = message.timestamp;
  
  // Update the conversation in memory
  setConversationInMemory(conversationId, conversation);
  
  console.log(`[UnifiedStorage] Memory storage updated. Conversation ${conversationId} now has ${conversation.messages.length} messages`);
}

export async function getConversations(): Promise<Array<{
  id: string;
  customerName: string;
  status: string;
  lastActivity: string;
  messageCount: number;
  assignedAgent?: string;
}>> {
  console.log('[UnifiedStorage] getConversations called, useSupabase:', useSupabase);
  
  try {
    if (useSupabase && supabase) {
      const supabaseConversations = await getConversationsFromSupabase();
      console.log('[UnifiedStorage] Supabase returned conversations:', supabaseConversations.length);
      
      // If Supabase returns no conversations, check memory as fallback
      if (supabaseConversations.length === 0) {
        const memoryConversations = getConversationsFromMemory();
        console.log('[UnifiedStorage] Memory fallback returned conversations:', memoryConversations.length);
        return memoryConversations;
      }
      
      return supabaseConversations;
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase fetch failed, using memory fallback:', error);
  }
  
  console.log('[UnifiedStorage] Using memory storage only');
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
  return getAllConversationsFromMemory()
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
  console.log(`[UnifiedStorage] getConversationMessages called for ${conversationId}, useSupabase:`, useSupabase);
  
  try {
    if (useSupabase && supabase) {
      const supabaseMessages = await getMessagesFromSupabase(conversationId, limit);
      console.log(`[UnifiedStorage] Supabase returned ${supabaseMessages.messages.length} messages for ${conversationId}`);
      
      // If Supabase returns no messages, check memory as fallback
      if (supabaseMessages.messages.length === 0) {
        const memoryMessages = getMessagesFromMemory(conversationId, limit);
        console.log(`[UnifiedStorage] Memory fallback returned ${memoryMessages.messages.length} messages for ${conversationId}`);
        return memoryMessages;
      }
      
      return supabaseMessages;
    }
  } catch (error) {
    console.error('[UnifiedStorage] Supabase fetch failed, using memory fallback:', error);
    return getMessagesFromMemory(conversationId, limit);
  }
  
  console.log(`[UnifiedStorage] Using memory storage only for ${conversationId}`);
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

  const messages = chatEvents
    ?.filter((event: any) => event.type === 'inbound' || event.type === 'agent_send')
    .map((event: any) => storedToNormalized({
      id: event.message_id || event.id,
      conversation_id: conversationId,
      text: event.text || '',
      sender: event.type === 'inbound' ? 'customer' : 'agent',
      timestamp: event.created_at
    })) || [];
  
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
  const conversation = getConversationFromMemory(conversationId);
  
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

export async function getConversation(conversationId: string): Promise<{
  id: string;
  customerName: string;
  status: string;
  lastActivity: string;
  messages: NormalizedMessage[];
  contact?: any;
} | null> {
  const { messages, contact } = await getConversationMessages(conversationId);
  
  if (messages.length === 0) {
    return null;
  }
  
  return {
    id: conversationId,
    customerName: contact?.name || `Customer ${conversationId.slice(-4)}`,
    status: 'waiting',
    lastActivity: messages[messages.length - 1]?.createdAt || new Date().toISOString(),
    messages,
    contact
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
  
  // Update memory storage
  const conversation = getConversationFromMemory(conversationId);
  if (conversation) {
    conversation.status = status;
    conversation.assigned_agent = agentId;
    conversation.last_activity = timestamp;
    setConversationInMemory(conversationId, conversation);
  }
  
  console.log(`[UnifiedStorage] Updated conversation ${conversationId} status to ${status}`);
}

export function getStorageInfo() {
  const stats = getMemoryStorageStats();
  return {
    useSupabase,
    supabaseConfigured: !!(supabaseUrl && supabaseServiceKey),
    memoryConversations: stats.totalConversations
  };
}

// Export memory storage for debugging
export function getMemoryStorageForDebug() {
  const stats = getMemoryStorageStats();
  const conversations = getAllConversationsFromMemory();
  
  return {
    totalConversations: stats.totalConversations,
    conversationIds: stats.conversationIds,
    totalMessages: stats.totalMessages,
    conversations: conversations.map(conv => ({
      id: conv.id,
      customerName: conv.customer_name,
      messageCount: conv.messages.length,
      lastActivity: conv.last_activity,
      status: conv.status,
      assignedAgent: conv.assigned_agent,
      messages: conv.messages.map(msg => ({
        id: msg.id,
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp
      }))
    }))
  };
}
