// /lib/memory-storage.ts
// In-memory storage fallback for development and testing
// This allows the chat system to work without external dependencies

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

// Use global scope to persist across requests in development
declare global {
  var __messageStore: Map<string, StoredMessage[]> | undefined;
  var __conversationStatusStore: Map<string, ConversationStatus> | undefined;
}

// In-memory storage that persists across requests
const messageStore = globalThis.__messageStore ?? new Map<string, StoredMessage[]>();
const conversationStatusStore = globalThis.__conversationStatusStore ?? new Map<string, ConversationStatus>();

if (!globalThis.__messageStore) {
  globalThis.__messageStore = messageStore;
}
if (!globalThis.__conversationStatusStore) {
  globalThis.__conversationStatusStore = conversationStatusStore;
}

export function storeMessage(message: Omit<StoredMessage, 'id' | 'created_at'>): StoredMessage {
  const storedMessage: StoredMessage = {
    ...message,
    id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: new Date().toISOString()
  };

  const conversationMessages = messageStore.get(message.conversation_id) || [];
  conversationMessages.push(storedMessage);
  messageStore.set(message.conversation_id, conversationMessages);

  // Update conversation status - new customer messages create waiting conversations
  if (message.type === 'inbound') {
    const existingStatus = conversationStatusStore.get(message.conversation_id);
    if (!existingStatus) {
      conversationStatusStore.set(message.conversation_id, {
        id: message.conversation_id,
        status: 'waiting',
        lastActivity: storedMessage.created_at
      });
    } else {
      // Update last activity
      existingStatus.lastActivity = storedMessage.created_at;
    }
  }

  console.log('[Memory Storage] Stored message:', {
    conversationId: message.conversation_id,
    messageId: storedMessage.message_id,
    text: message.text?.substring(0, 50),
    type: message.type,
    totalMessages: conversationMessages.length
  });

  return storedMessage;
}

export function getMessages(conversationId: string, limit = 20): StoredMessage[] {
  const messages = messageStore.get(conversationId) || [];
  
  console.log('[Memory Storage] Retrieved messages:', {
    conversationId,
    messageCount: messages.length,
    limit
  });

  // Return most recent messages first, then reverse for chronological order
  return messages
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-limit);
}

// Conversation status management
export function claimConversation(conversationId: string, agentId: string): boolean {
  const status = conversationStatusStore.get(conversationId);
  if (status && status.status === 'waiting') {
    status.status = 'assigned';
    status.agentId = agentId;
    status.claimedAt = new Date().toISOString();
    status.lastActivity = new Date().toISOString();
    
    console.log('[Memory Storage] Claimed conversation:', {
      conversationId,
      agentId,
      claimedAt: status.claimedAt
    });
    
    return true;
  }
  return false;
}

export function getConversationStatus(conversationId: string): ConversationStatus | null {
  return conversationStatusStore.get(conversationId) || null;
}

export function getAllConversations(): Array<{ id: string; messageCount: number; lastMessage?: StoredMessage; status: ConversationStatus }> {
  const conversations: Array<{ id: string; messageCount: number; lastMessage?: StoredMessage; status: ConversationStatus }> = [];
  
  for (const [conversationId, messages] of messageStore.entries()) {
    const lastMessage = messages[messages.length - 1];
    const status = conversationStatusStore.get(conversationId) || {
      id: conversationId,
      status: 'waiting' as const,
      lastActivity: lastMessage?.created_at || new Date().toISOString()
    };
    
    conversations.push({
      id: conversationId,
      messageCount: messages.length,
      lastMessage,
      status
    });
  }

  console.log('[Memory Storage] Retrieved conversations:', {
    conversationCount: conversations.length,
    conversations: conversations.slice(0, 3).map(c => ({ 
      id: c.id, 
      messageCount: c.messageCount,
      status: c.status.status
    }))
  });

  return conversations.sort((a, b) => {
    const aTime = a.lastMessage?.created_at || '';
    const bTime = b.lastMessage?.created_at || '';
    return bTime.localeCompare(aTime); // Most recent first
  });
}

export function updateConversationStatus(conversationId: string, updates: Partial<ConversationStatus>): boolean {
  try {
    const currentStatus = conversationStatusStore.get(conversationId);
    
    if (!currentStatus) {
      // Create new status if it doesn't exist
      const newStatus: ConversationStatus = {
        id: conversationId,
        status: 'waiting',
        lastActivity: new Date().toISOString(),
        ...updates
      };
      conversationStatusStore.set(conversationId, newStatus);
      console.log('[Memory Storage] Created new conversation status:', newStatus);
      return true;
    }

    // Update existing status
    const updatedStatus: ConversationStatus = {
      ...currentStatus,
      ...updates,
      lastActivity: new Date().toISOString()
    };
    
    conversationStatusStore.set(conversationId, updatedStatus);
    console.log('[Memory Storage] Updated conversation status:', updatedStatus);
    return true;
  } catch (error) {
    console.error('[Memory Storage] Error updating conversation status:', error);
    return false;
  }
}

export function deleteConversation(conversationId: string): boolean {
  try {
    // Remove messages
    const messagesDeleted = messageStore.delete(conversationId);
    
    // Remove conversation status
    const statusDeleted = conversationStatusStore.delete(conversationId);
    
    console.log('[Memory Storage] Permanently deleted conversation:', {
      conversationId,
      messagesDeleted,
      statusDeleted
    });
    
    return messagesDeleted || statusDeleted;
  } catch (error) {
    console.error('[Memory Storage] Error deleting conversation:', error);
    return false;
  }
}
