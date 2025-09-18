// Singleton memory storage that persists across Next.js hot reloads
// Uses global object to maintain state during development

interface StoredMessage {
  id: string;
  conversation_id: string;
  text: string;
  sender: string;
  timestamp: string;
}

interface ConversationWithMessages {
  id: string;
  customer_name: string;
  messages: StoredMessage[];
  last_activity: string;
  status: 'waiting' | 'assigned' | 'closed';
  assigned_agent?: string;
}

// Use global object to persist across hot reloads in development
declare global {
  var __memoryConversations: Map<string, ConversationWithMessages> | undefined;
}

// Initialize or get existing memory storage
function getMemoryStorage(): Map<string, ConversationWithMessages> {
  if (!global.__memoryConversations) {
    console.log('[MemoryStorage] Initializing new memory storage');
    global.__memoryConversations = new Map<string, ConversationWithMessages>();
  }
  return global.__memoryConversations;
}

export function getConversationFromMemory(conversationId: string): ConversationWithMessages | undefined {
  const storage = getMemoryStorage();
  return storage.get(conversationId);
}

export function setConversationInMemory(conversationId: string, conversation: ConversationWithMessages): void {
  const storage = getMemoryStorage();
  storage.set(conversationId, conversation);
}

export function getAllConversationsFromMemory(): ConversationWithMessages[] {
  const storage = getMemoryStorage();
  return Array.from(storage.values());
}

export function getMemoryStorageStats(): {
  totalConversations: number;
  conversationIds: string[];
  totalMessages: number;
} {
  const storage = getMemoryStorage();
  const conversations = Array.from(storage.values());
  return {
    totalConversations: conversations.length,
    conversationIds: Array.from(storage.keys()),
    totalMessages: conversations.reduce((total, conv) => total + conv.messages.length, 0)
  };
}

export function clearMemoryStorage(): void {
  const storage = getMemoryStorage();
  storage.clear();
  console.log('[MemoryStorage] Memory storage cleared');
}

export { ConversationWithMessages, StoredMessage };
