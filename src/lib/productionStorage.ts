// Production-ready storage system with Supabase persistence and in-memory fallback
import { createClient } from '@supabase/supabase-js';

interface Message {
  id: string;
  text: string;
  sender: 'customer' | 'agent';
  timestamp: string;
}

interface Conversation {
  id: string;
  customerName: string;
  messages: Message[];
  lastActivity: string;
  status: 'waiting' | 'assigned' | 'closed';
  assignedAgent?: string;
}

// Supabase client (only if properly configured)
let supabase: any = null;
let useSupabase = false;

// Initialize Supabase if environment variables are available
try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_TOKEN;
  
  if (supabaseUrl && supabaseKey && 
      supabaseUrl !== 'https://your-project.supabase.co' && 
      supabaseKey !== 'your-service-role-key') {
    supabase = createClient(supabaseUrl, supabaseKey);
    useSupabase = true;
    console.log('[Storage] Using Supabase for persistent storage');
  } else {
    console.log('[Storage] Supabase not configured, using in-memory storage');
  }
} catch (error) {
  console.log('[Storage] Supabase initialization failed, using in-memory storage:', error);
}

// In-memory fallback storage
const memoryConversations = new Map<string, Conversation>();

export async function addMessage(conversationId: string, message: Omit<Message, 'timestamp'>) {
  const timestamp = new Date().toISOString();
  const fullMessage: Message = { ...message, timestamp };
  
  try {
    if (useSupabase && supabase) {
      // Store in Supabase
      await storeInSupabase(conversationId, fullMessage);
    }
  } catch (error) {
    console.error('[Storage] Supabase storage failed, using memory fallback:', error);
  }
  
  // Always store in memory as backup/cache
  storeInMemory(conversationId, fullMessage);
  
  console.log(`[Storage] Added message to conversation ${conversationId}:`, {
    messageId: message.id,
    text: message.text,
    storage: useSupabase ? 'supabase+memory' : 'memory-only'
  });
  
  return fullMessage;
}

async function storeInSupabase(conversationId: string, message: Message) {
  // Store conversation if it doesn't exist
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
        last_activity: message.timestamp,
        created_at: message.timestamp
      });
  }
  
  // Store message
  await supabase
    .from('messages')
    .insert({
      id: message.id,
      conversation_id: conversationId,
      text: message.text,
      sender: message.sender,
      timestamp: message.timestamp,
      created_at: message.timestamp
    });
    
  // Update conversation last activity
  await supabase
    .from('conversations')
    .update({ 
      last_activity: message.timestamp,
      updated_at: message.timestamp 
    })
    .eq('id', conversationId);
}

function storeInMemory(conversationId: string, message: Message) {
  let conversation = memoryConversations.get(conversationId);
  if (!conversation) {
    conversation = {
      id: conversationId,
      customerName: `Customer ${conversationId.slice(-4)}`,
      messages: [],
      lastActivity: message.timestamp,
      status: 'waiting'
    };
    memoryConversations.set(conversationId, conversation);
  }
  
  conversation.messages.push(message);
  conversation.lastActivity = message.timestamp;
}

export async function getConversations(): Promise<Conversation[]> {
  try {
    if (useSupabase && supabase) {
      return await getConversationsFromSupabase();
    }
  } catch (error) {
    console.error('[Storage] Supabase fetch failed, using memory fallback:', error);
  }
  
  // Fallback to memory
  return getConversationsFromMemory();
}

async function getConversationsFromSupabase(): Promise<Conversation[]> {
  const { data: conversations } = await supabase
    .from('conversations')
    .select(`
      id,
      customer_name,
      status,
      last_activity,
      assigned_agent,
      messages (
        id,
        text,
        sender,
        timestamp
      )
    `)
    .order('last_activity', { ascending: false });
    
  return (conversations || []).map((conv: any) => ({
    id: conv.id,
    customerName: conv.customer_name,
    messages: (conv.messages || []).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    lastActivity: conv.last_activity,
    status: conv.status,
    assignedAgent: conv.assigned_agent
  }));
}

function getConversationsFromMemory(): Conversation[] {
  return Array.from(memoryConversations.values())
    .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
}

export async function getConversation(id: string): Promise<Conversation | null> {
  try {
    if (useSupabase && supabase) {
      return await getConversationFromSupabase(id);
    }
  } catch (error) {
    console.error('[Storage] Supabase fetch failed, using memory fallback:', error);
  }
  
  // Fallback to memory
  return memoryConversations.get(id) || null;
}

async function getConversationFromSupabase(id: string): Promise<Conversation | null> {
  const { data: conversation } = await supabase
    .from('conversations')
    .select(`
      id,
      customer_name,
      status,
      last_activity,
      assigned_agent,
      messages (
        id,
        text,
        sender,
        timestamp
      )
    `)
    .eq('id', id)
    .single();
    
  if (!conversation) return null;
  
  return {
    id: conversation.id,
    customerName: conversation.customer_name,
    messages: (conversation.messages || []).sort((a: any, b: any) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    lastActivity: conversation.last_activity,
    status: conversation.status,
    assignedAgent: conversation.assigned_agent
  };
}

export async function updateConversationStatus(
  conversationId: string, 
  status: 'waiting' | 'assigned' | 'closed',
  agentId?: string
): Promise<Conversation | null> {
  const timestamp = new Date().toISOString();
  
  try {
    if (useSupabase && supabase) {
      await supabase
        .from('conversations')
        .update({ 
          status,
          assigned_agent: agentId,
          last_activity: timestamp,
          updated_at: timestamp
        })
        .eq('id', conversationId);
    }
  } catch (error) {
    console.error('[Storage] Supabase update failed, using memory fallback:', error);
  }
  
  // Update memory
  const conversation = memoryConversations.get(conversationId);
  if (conversation) {
    conversation.status = status;
    if (agentId) {
      conversation.assignedAgent = agentId;
    }
    conversation.lastActivity = timestamp;
  }
  
  console.log(`[Storage] Updated conversation ${conversationId} status to ${status}`);
  return conversation || null;
}

export async function clearAllData() {
  try {
    if (useSupabase && supabase) {
      await supabase.from('messages').delete().neq('id', '');
      await supabase.from('conversations').delete().neq('id', '');
    }
  } catch (error) {
    console.error('[Storage] Supabase clear failed:', error);
  }
  
  memoryConversations.clear();
  console.log('[Storage] Cleared all data');
}

export function getStorageInfo() {
  return {
    type: useSupabase ? 'supabase+memory' : 'memory-only',
    supabaseConfigured: useSupabase,
    memoryConversations: memoryConversations.size
  };
}

