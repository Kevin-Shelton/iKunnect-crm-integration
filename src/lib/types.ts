// New types for n8n/MCP-based logic
export type Direction = 'inbound' | 'outbound';
export type Sender = 'contact' | 'human_agent' | 'ai_agent' | 'system';

export const enum MsgTypeIndex {
  TYPE_LIVE_CHAT = 29,
  TYPE_LIVE_CHAT_INFO_MESSAGE = 30,
}

export interface GhlMessage {
  id: string;
  direction: Direction;
  type: number;                 // numeric index from GHL
  messageType?: string;         // e.g., "TYPE_LIVE_CHAT"
  body?: string;
  conversationId?: string | null;
  dateAdded?: string;
  dateUpdated?: string;
  locationId?: string;
  contactId?: string;
  source?: string | null;       // sometimes "app" or provider tag
  chatWidgetId?: string | null;
}

export interface NormalizedMessage {
  id: string;
  conversationId: string | null;
  direction: Direction;
  sender: Sender;               // derived
  category: 'chat' | 'info' | 'other';
  text: string;
  createdAt?: string;
  raw: GhlMessage;
}

export interface MirrorPayload {
  contact?: { id: string | null; created?: boolean };
  conversation?: { id: string | null; found?: boolean };
  messages: GhlMessage[] | NormalizedMessage[];
  warn?: string;
}

// Legacy types for existing system compatibility
// TypeScript type definitions for CRM MCP API integration

// Core Configuration
export interface CRMConfig {
  mcpUrl: string;
  pit: string; // Private Integration Token
  locationId: string;
}

// MCP Tool Call Structure
export interface MCPToolCall {
  tool: string;
  input: Record<string, unknown>;
}

// Generic MCP Response Structure
export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Contact Types
export interface ContactInput {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
  source?: string;
  assignedTo?: string;
}

export interface Contact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  timezone?: string;
  dnd?: boolean;
  tags?: string[];
  customFields?: Record<string, string | number | boolean>;
  source?: string;
  assignedTo?: string;
  dateAdded?: string;
  dateUpdated?: string;
}

// Conversation Types
export interface ConversationSearchInput {
  contactId?: string;
  limit?: number;
  sort?: 'asc' | 'desc';
  startAfter?: string;
  endBefore?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  unreadCount?: number;
  fullName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  assignedTo?: string;
  status?: 'waiting' | 'assigned' | 'rejected' | 'open' | 'closed';
  channel?: string;
  dateAdded?: string;
  dateUpdated?: string;
  
  // Agent assignment properties
  agentId?: string;
  claimedAt?: string;
  
  // Rejection properties
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  
  // Restoration properties
  restoredAt?: string;
  restoredBy?: string;
  
  // Queue management properties
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  passedCount?: number;
  lastPassedAt?: string;
  hidden?: boolean;
  
  // Message count for display
  messageCount?: number;
  
  // Translation and sentiment properties
  customerLanguage?: string; // Customer's selected language (e.g., 'es', 'pt', 'fr')
  sentiment?: string; // Customer's sentiment (e.g., 'positive', 'negative', 'neutral')
  sentimentConfidence?: number; // Confidence score for sentiment analysis
}

export interface ConversationSearchResponse {
  items: Conversation[];
  total: number;
  nextCursor?: string;
}

// Message Types
export interface MessageInput {
  contactId?: string;
  conversationId?: string;
  body: string;
  channel?: 'chat' | 'sms' | 'email' | 'whatsapp' | 'facebook' | 'instagram';
  direction?: 'inbound' | 'outbound';
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  channel?: string;
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'file';
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
  dateAdded: string;
  source?: string;
  userId?: string;
  userName?: string;
}

export interface MessagesResponse {
  items: Message[];
  total: number;
  nextCursor?: string;
}

// Opportunity Types
export interface OpportunityInput {
  contactId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  monetaryValue?: number;
  assignedTo?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  source?: string;
  notes?: string;
}

export interface Opportunity {
  id: string;
  contactId: string;
  locationId: string;
  name: string;
  pipelineId: string;
  stageId: string;
  monetaryValue?: number;
  assignedTo?: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  source?: string;
  notes?: string;
  dateAdded: string;
  dateUpdated: string;
}

// Chat Session Types for API
export interface ChatSessionInput {
  contactId?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  channel?: string;
}

export interface ChatSessionResponse {
  success: boolean;
  conversationId?: string;
  contactId?: string;
  isNewContact?: boolean;
  isNewConversation?: boolean;
  error?: string;
}

export interface ChatThreadInput {
  conversationId: string;
}

export interface ChatThreadResponse {
  success: boolean;
  messages?: Message[];
  contact?: Contact;
  conversation?: Conversation;
  error?: string;
}

export interface ChatMessageInput {
  conversationId: string;
  body: string;
  attachments?: Array<{
    url: string;
    type: string;
    name?: string;
  }>;
}

export interface ChatMessageResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

// Agent and Queue Types
export interface Agent {
  id: string;
  name: string;
  email: string;
  status: 'available' | 'busy' | 'away' | 'offline';
  activeChats: number;
  maxChats: number;
}

export interface QueueStats {
  waiting: number;
  assigned: number;
  total: number;
}

export interface ConversationQueue {
  waiting: Conversation[];
  assigned: Conversation[];
  rejected: Conversation[];
  all: Conversation[];
}

// Enhanced queue component interfaces
export interface WaitingChat {
  id: string;
  contactName: string;
  lastMessageBody: string;
  lastMessageDate: string;
  unreadCount: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  waitTime: string;
}

export interface RejectedChat {
  id: string;
  contactName: string;
  lastMessageBody: string;
  lastMessageDate: string;
  rejectedAt: string;
  rejectedBy: string;
  rejectionReason: string;
  originalPriority: 'low' | 'normal' | 'high' | 'urgent';
  tags: string[];
  messageCount: number;
}

// Multi-chat interface types
export interface ActiveChat {
  conversationId: string;
  contactName: string;
  lastActivity: string;
  unreadCount: number;
  isMinimized: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
}

// Typing indicator types
export interface TypingIndicator {
  conversationId: string;
  userType: 'agent' | 'customer';
  userId: string;
  timestamp: string;
}

// AI Assistant Types
export interface AIAssistantRequest {
  conversationId: string;
  context?: string;
  messageHistory?: Message[];
  requestType: 'draft' | 'auto-reply' | 'suggestion';
}

export interface AIAssistantResponse {
  success: boolean;
  suggestion?: string;
  confidence?: number;
  reasoning?: string;
  error?: string;
}

// API Error Types
export interface APIError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
}

// Authentication Types
export interface AuthToken {
  sub: string; // Agent ID
  name: string;
  email: string;
  role: string;
  locationId: string;
  exp: number;
  iat: number;
}

export interface AuthenticatedRequest {
  agent: AuthToken;
}

