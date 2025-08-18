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
  input: Record<string, any>;
}

// Generic MCP Response Structure
export interface MCPResponse<T = any> {
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
  customFields?: Record<string, any>;
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
  dndSettings?: {
    Call?: {
      status: string;
      message: string;
    };
    Email?: {
      status: string;
      message: string;
    };
    SMS?: {
      status: string;
      message: string;
    };
    WhatsApp?: {
      status: string;
      message: string;
    };
    GMB?: {
      status: string;
      message: string;
    };
  };
  tags?: string[];
  customFields?: Record<string, any>;
  source?: string;
  assignedTo?: string;
  dateAdded?: string;
  dateUpdated?: string;
}

// Conversation Types
export interface ConversationSearchInput {
  contactId?: string;
  locationId?: string;
  assignedTo?: string;
  status?: 'open' | 'closed';
  limit?: number;
  startAfter?: string;
  sort?: 'asc' | 'desc';
}

export interface Conversation {
  id: string;
  contactId: string;
  locationId: string;
  assignedTo?: string;
  status: 'open' | 'closed';
  lastMessageDate?: string;
  lastMessageBody?: string;
  unreadCount?: number;
  dateAdded: string;
  dateUpdated?: string;
}

export interface ConversationSearchResponse {
  items: Conversation[];
  total: number;
  startAfter?: string;
}

// Message Types
export interface MessageInput {
  contactId?: string;
  conversationId?: string;
  body: string;
  channel: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Chat' | 'Review' | 'Web_Chat' | 'API';
  direction?: 'inbound' | 'outbound';
  status?: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  scheduledDate?: string;
  attachments?: MessageAttachment[];
}

export interface MessageAttachment {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  contactId: string;
  locationId: string;
  body: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled';
  dateAdded: string;
  dateUpdated?: string;
  scheduledDate?: string;
  attachments?: MessageAttachment[];
  userId?: string;
  userName?: string;
}

export interface MessagesResponse {
  items: Message[];
  total: number;
  conversationId: string;
}

// Opportunity Types
export interface OpportunityInput {
  pipelineId: string;
  stageId: string;
  contactId: string;
  name: string;
  monetaryValue?: number;
  assignedTo?: string;
  status?: 'open' | 'won' | 'lost' | 'abandoned';
  source?: string;
  customFields?: Record<string, any>;
  notes?: string;
}

export interface Opportunity {
  id: string;
  locationId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  name: string;
  monetaryValue?: number;
  assignedTo?: string;
  status: 'open' | 'won' | 'lost' | 'abandoned';
  source?: string;
  customFields?: Record<string, any>;
  notes?: string;
  dateAdded: string;
  dateUpdated?: string;
  lastStatusChange?: string;
  lastStageChange?: string;
}

// Pipeline Types
export interface Pipeline {
  id: string;
  locationId: string;
  name: string;
  stages: PipelineStage[];
  dateAdded: string;
  dateUpdated?: string;
}

export interface PipelineStage {
  id: string;
  name: string;
  position: number;
}

// Calendar Types
export interface Calendar {
  id: string;
  locationId: string;
  name: string;
  description?: string;
  slug?: string;
  widgetSlug?: string;
  calendarType: string;
  eventTitle?: string;
  eventColor?: string;
  meetingLocation?: string;
  slotDuration?: number;
  slotInterval?: number;
  slotBuffer?: number;
  sticky?: boolean;
  isActive?: boolean;
  openHours?: CalendarOpenHours[];
  dateAdded: string;
  dateUpdated?: string;
}

export interface CalendarOpenHours {
  daysOfTheWeek: number[];
  hours: {
    openHour: number;
    openMinute: number;
    closeHour: number;
    closeMinute: number;
  }[];
}

// Custom Field Types
export interface CustomField {
  id: string;
  locationId: string;
  name: string;
  fieldKey: string;
  dataType: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'PHONE' | 'EMAIL' | 'DATE' | 'DATETIME' | 'BOOLEAN' | 'SINGLE_OPTIONS' | 'MULTIPLE_OPTIONS' | 'FILE_UPLOAD';
  position: number;
  isRequired?: boolean;
  placeholder?: string;
  options?: string[];
  dateAdded: string;
  dateUpdated?: string;
}

// Location Types
export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  website?: string;
  timezone?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  businessType?: string;
  dateAdded: string;
  dateUpdated?: string;
}

// Error Types
export interface APIError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

// Chat Integration Specific Types
export interface ChatSessionInput {
  name: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, any>;
  source?: string;
  tags?: string[];
}

export interface ChatSessionResponse {
  contactId: string;
  isNewContact: boolean;
  contact: Contact;
}

export interface ChatThreadInput {
  contactId: string;
  channel?: string;
}

export interface ChatThreadResponse {
  conversationId: string;
  isNewConversation: boolean;
  conversation?: Conversation;
}

export interface ChatMessageInput {
  conversationId: string;
  body: string;
  channel?: string;
}

export interface ChatMessageResponse {
  messageId: string;
  message: Message;
}

// Bot Integration Types
export interface BotProcessInput {
  message: string;
  contactId: string;
  conversationId: string;
  context?: Record<string, any>;
}

export interface BotProcessResponse {
  response: string;
  action?: 'continue' | 'transfer' | 'close' | 'create_opportunity';
  actionData?: any;
  confidence?: number;
  intent?: string;
}

export interface BotAutoRespondInput {
  contactId: string;
  conversationId: string;
  lastMessage: string;
  conversationHistory?: Message[];
}

export interface BotAutoRespondResponse {
  shouldRespond: boolean;
  response?: string;
  delay?: number; // seconds to wait before responding
  action?: 'respond' | 'transfer' | 'notify';
}

