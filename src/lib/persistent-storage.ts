// Persistent storage solution that works in both development and production
// Uses file system in development and external storage in production

import { promises as fs } from 'fs';
import path from 'path';

interface StoredMessage {
  id: string;
  conversation_id: string;
  type: 'inbound' | 'agent_send' | 'suggestions' | 'admin';
  message_id: string;
  text: string;
  payload: Record<string, unknown>;
  created_at: string;
}

interface ConversationStatus {
  id: string;
  status: 'waiting' | 'assigned' | 'closed' | 'rejected';
  agentId?: string;
  claimedAt?: string;
  lastActivity: string;
  passedBy?: string;
  passedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  restoredBy?: string;
  restoredAt?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  hidden?: boolean;
}

// Storage paths
const STORAGE_DIR = '/tmp/chat-storage';
const MESSAGES_FILE = path.join(STORAGE_DIR, 'messages.json');
const CONVERSATIONS_FILE = path.join(STORAGE_DIR, 'conversations.json');

// In-memory cache for performance
let messageCache: Map<string, StoredMessage[]> | null = null;
let conversationCache: Map<string, ConversationStatus> | null = null;

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore error
  }
}

// Load data from storage
async function loadMessages(): Promise<Map<string, StoredMessage[]>> {
  if (messageCache) return messageCache;
  
  try {
    await ensureStorageDir();
    const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    messageCache = new Map(Object.entries(parsed).map(([k, v]) => [k, v as StoredMessage[]]));
    console.log('[PersistentStorage] Loaded messages from file:', messageCache.size, 'conversations');
  } catch (error) {
    console.log('[PersistentStorage] No existing messages file, starting fresh');
    messageCache = new Map();
  }
  
  return messageCache;
}

async function loadConversations(): Promise<Map<string, ConversationStatus>> {
  if (conversationCache) return conversationCache;
  
  try {
    await ensureStorageDir();
    const data = await fs.readFile(CONVERSATIONS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    conversationCache = new Map(Object.entries(parsed).map(([k, v]) => [k, v as ConversationStatus]));
    console.log('[PersistentStorage] Loaded conversations from file:', conversationCache.size, 'conversations');
  } catch (error) {
    console.log('[PersistentStorage] No existing conversations file, starting fresh');
    conversationCache = new Map();
  }
  
  return conversationCache;
}

// Save data to storage
async function saveMessages(messages: Map<string, StoredMessage[]>) {
  try {
    await ensureStorageDir();
    const data = Object.fromEntries(messages.entries());
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(data, null, 2));
    console.log('[PersistentStorage] Saved messages to file');
  } catch (error) {
    console.error('[PersistentStorage] Error saving messages:', error);
  }
}

async function saveConversations(conversations: Map<string, ConversationStatus>) {
  try {
    await ensureStorageDir();
    const data = Object.fromEntries(conversations.entries());
    await fs.writeFile(CONVERSATIONS_FILE, JSON.stringify(data, null, 2));
    console.log('[PersistentStorage] Saved conversations to file');
  } catch (error) {
    console.error('[PersistentStorage] Error saving conversations:', error);
  }
}

// Public API
export async function storeMessage(message: Omit<StoredMessage, 'id' | 'created_at'>): Promise<StoredMessage> {
  const messages = await loadMessages();
  
  const storedMessage: StoredMessage = {
    ...message,
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };

  const conversationMessages = messages.get(message.conversation_id) || [];
  conversationMessages.push(storedMessage);
  messages.set(message.conversation_id, conversationMessages);

  // Update conversation status
  const conversations = await loadConversations();
  const existingStatus = conversations.get(message.conversation_id);
  const status: ConversationStatus = {
    id: message.conversation_id,
    status: existingStatus?.status || 'waiting',
    lastActivity: storedMessage.created_at,
    ...existingStatus
  };
  conversations.set(message.conversation_id, status);

  // Save to storage
  await Promise.all([
    saveMessages(messages),
    saveConversations(conversations)
  ]);

  console.log('[PersistentStorage] Stored message:', {
    conversationId: message.conversation_id,
    messageId: storedMessage.message_id,
    text: storedMessage.text.substring(0, 50),
    totalMessages: conversationMessages.length
  });

  return storedMessage;
}

export async function getConversationMessages(conversationId: string, limit: number = 25): Promise<StoredMessage[]> {
  const messages = await loadMessages();
  const conversationMessages = messages.get(conversationId) || [];
  
  console.log('[PersistentStorage] Retrieved messages:', {
    conversationId,
    messageCount: conversationMessages.length,
    limit
  });

  return conversationMessages.slice(-limit);
}

export async function getAllConversations(): Promise<Array<{
  id: string;
  messageCount: number;
  lastMessage?: StoredMessage;
  status?: ConversationStatus;
}>> {
  const [messages, conversations] = await Promise.all([
    loadMessages(),
    loadConversations()
  ]);

  const result = Array.from(messages.entries()).map(([conversationId, msgs]) => {
    const lastMessage = msgs[msgs.length - 1];
    const status = conversations.get(conversationId);
    
    return {
      id: conversationId,
      messageCount: msgs.length,
      lastMessage,
      status
    };
  });

  console.log('[PersistentStorage] Retrieved conversations:', {
    conversationCount: result.length,
    conversations: result.slice(0, 3).map(c => ({
      id: c.id,
      messageCount: c.messageCount,
      status: c.status?.status,
      lastMessageText: c.lastMessage?.text?.substring(0, 30)
    }))
  });

  return result;
}

export async function updateConversationStatus(
  conversationId: string, 
  updates: Partial<ConversationStatus>
): Promise<boolean> {
  const conversations = await loadConversations();
  const existing = conversations.get(conversationId);
  
  if (!existing) {
    console.log('[PersistentStorage] Creating new conversation status:', conversationId);
    const newStatus: ConversationStatus = {
      id: conversationId,
      status: 'waiting',
      lastActivity: new Date().toISOString(),
      ...updates
    };
    conversations.set(conversationId, newStatus);
  } else {
    console.log('[PersistentStorage] Updating conversation status:', conversationId, updates);
    const updated = { ...existing, ...updates };
    conversations.set(conversationId, updated);
  }

  await saveConversations(conversations);
  return true;
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const [messages, conversations] = await Promise.all([
    loadMessages(),
    loadConversations()
  ]);

  messages.delete(conversationId);
  conversations.delete(conversationId);

  await Promise.all([
    saveMessages(messages),
    saveConversations(conversations)
  ]);

  console.log('[PersistentStorage] Deleted conversation:', conversationId);
  return true;
}

// Debug function
export async function getStorageDebugInfo() {
  const [messages, conversations] = await Promise.all([
    loadMessages(),
    loadConversations()
  ]);

  return {
    messageConversations: Array.from(messages.keys()),
    conversationStatuses: Array.from(conversations.entries()).map(([id, status]) => ({
      id,
      status: status.status,
      agentId: status.agentId,
      lastActivity: status.lastActivity
    })),
    totalMessages: Array.from(messages.values()).reduce((sum, msgs) => sum + msgs.length, 0),
    totalConversations: conversations.size
  };
}
