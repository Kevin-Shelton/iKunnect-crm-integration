// In-memory storage for development/testing when Supabase is not configured
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

// Use global scope to persist across requests in development
declare global {
  var __messageStore: Map<string, StoredMessage[]> | undefined;
}

// In-memory storage that persists across requests
const messageStore = globalThis.__messageStore ?? new Map<string, StoredMessage[]>();
if (!globalThis.__messageStore) {
  globalThis.__messageStore = messageStore;
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

  // Return messages sorted by creation time, limited
  return messages
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-limit);
}

export function getAllConversations(): Array<{ id: string; messageCount: number; lastMessage?: StoredMessage }> {
  const conversations: Array<{ id: string; messageCount: number; lastMessage?: StoredMessage }> = [];
  
  for (const [conversationId, messages] of messageStore.entries()) {
    const lastMessage = messages[messages.length - 1];
    conversations.push({
      id: conversationId,
      messageCount: messages.length,
      lastMessage
    });
  }

  console.log('[Memory Storage] Retrieved conversations:', {
    conversationCount: conversations.length,
    conversations: conversations.map(c => ({ id: c.id, messageCount: c.messageCount }))
  });

  return conversations.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
    return bTime - aTime; // Most recent first
  });
}

export function clearAllMessages(): void {
  messageStore.clear();
  console.log('[Memory Storage] Cleared all messages');
}

// Debug function to inspect current state
export function debugStorage(): void {
  console.log('[Memory Storage Debug]', {
    conversationCount: messageStore.size,
    conversations: Array.from(messageStore.entries()).map(([id, messages]) => ({
      id,
      messageCount: messages.length,
      messages: messages.map(m => ({ id: m.id, text: m.text?.substring(0, 30), type: m.type }))
    }))
  });
}
