// CRM MCP Client Library for GoHighLevel Integration
import {
  CRMConfig,
  MCPToolCall,
  MCPResponse,
  ContactInput,
  Contact,
  ConversationSearchInput,
  ConversationSearchResponse,
  MessageInput,
  Message,
  MessagesResponse,
  OpportunityInput,
  Opportunity,
  Conversation
} from './types';

export class CRMMCPClient {
  private config: CRMConfig;
  private headers: Record<string, string>;

  constructor(config: CRMConfig) {
    this.config = config;
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'User-Agent': 'iKunnect-Agent-Chat-Desk/1.0.0'
    };

    // Only add Authorization header if token is provided
    if (config.pit) {
      this.headers['Authorization'] = `Bearer ${config.pit}`;
    }

    // Only add locationId header if provided
    if (config.locationId) {
      this.headers['locationId'] = config.locationId;
    }
  }

  /**
   * Generic method to call any MCP tool
   */
  async callTool<T = unknown>(tool: string, input: Record<string, unknown> = {}): Promise<MCPResponse<T>> {
    try {
      // Use proper JSON-RPC 2.0 format
      const payload = {
        jsonrpc: "2.0",
        method: tool,
        params: input,
        id: Math.random().toString(36).substring(7)
      };
      
      console.log(`[CRM MCP] Calling tool: ${tool}`, { input });
      
      const response = await fetch(this.config.mcpUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error(`[CRM MCP] Tool ${tool} failed:`, {
          status: response.status,
          statusText: response.statusText,
          body: responseText
        });
        
        throw new Error(`MCP ${tool} failed: ${response.status} ${responseText}`);
      }

      let data;
      try {
        // Handle SSE format response
        data = parseMcpEnvelope(response.status, responseText);
      } catch (parseError) {
        console.error(`[CRM MCP] Failed to parse response for ${tool}:`, parseError);
        throw new Error(`Invalid response from MCP ${tool}: ${parseError instanceof Error ? parseError.message : 'Parse error'}`);
      }

      console.log(`[CRM MCP] Tool ${tool} succeeded:`, data);
      
      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error(`[CRM MCP] Error calling tool ${tool}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: undefined
      };
    }
  }

  // Contact Management Methods
  
  /**
   * Create or update a contact
   */
  async upsertContact(contactData: ContactInput): Promise<MCPResponse<Contact>> {
    return this.callTool<Contact>('contacts_upsert-contact', contactData as unknown as Record<string, unknown>);
  }

  /**
   * Get a contact by ID
   */
  async getContact(contactId: string): Promise<MCPResponse<Contact>> {
    return this.callTool<Contact>('contacts_get-contact', { contactId });
  }

  /**
   * Get contacts with optional filtering
   */
  async getContacts(params: {
    limit?: number;
    startAfter?: string;
    query?: string;
  } = {}): Promise<MCPResponse<{ items: Contact[]; total: number }>> {
    return this.callTool('contacts_get-contacts', params);
  }

  /**
   * Search for a contact by email or phone
   */
  async searchContact(email?: string, phone?: string): Promise<MCPResponse<Contact[]>> {
    const searchParams: Record<string, string> = {};
    if (email) searchParams.email = email;
    if (phone) searchParams.phone = phone;
    
    return this.callTool('contacts_search-contact', searchParams);
  }

  // Conversation Management Methods
  
  /**
   * Search for conversations
   */
  async searchConversations(params: ConversationSearchInput): Promise<MCPResponse<ConversationSearchResponse>> {
    return this.callTool<ConversationSearchResponse>('conversations_search-conversation', params as unknown as Record<string, unknown>);
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string, limit: number = 25): Promise<MCPResponse<MessagesResponse>> {
    return this.callTool<MessagesResponse>('conversations_get-messages', {
      conversationId,
      limit
    });
  }

  /**
   * Send a new message
   */
  async sendMessage(messageData: MessageInput): Promise<MCPResponse<Message>> {
    return this.callTool<Message>('conversations_send-a-new-message', messageData as unknown as Record<string, unknown>);
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationId: string): Promise<MCPResponse<Conversation>> {
    return this.callTool('conversations_get-conversation', { conversationId });
  }

  /**
   * Get all conversations for queue management
   */
  async getAllConversations(params: {
    limit?: number;
    status?: 'open' | 'closed';
    assignedTo?: string;
  } = {}): Promise<MCPResponse<ConversationSearchResponse>> {
    return this.callTool<ConversationSearchResponse>('conversations_get-all-conversations', params);
  }

  /**
   * Assign conversation to agent
   */
  async assignConversation(conversationId: string, agentId: string): Promise<MCPResponse<{ success: boolean }>> {
    return this.callTool('conversations_assign-conversation', {
      conversationId,
      assignedTo: agentId
    });
  }

  /**
   * Close a conversation
   */
  async closeConversation(conversationId: string): Promise<MCPResponse<{ success: boolean }>> {
    return this.callTool('conversations_close-conversation', { conversationId });
  }

  // Opportunity Management Methods
  
  /**
   * Create a new opportunity
   */
  async createOpportunity(opportunityData: OpportunityInput): Promise<MCPResponse<Opportunity>> {
    return this.callTool<Opportunity>('opportunities_create-opportunity', opportunityData as unknown as Record<string, unknown>);
  }

  /**
   * Get an opportunity by ID
   */
  async getOpportunity(opportunityId: string): Promise<MCPResponse<Opportunity>> {
    return this.callTool<Opportunity>('opportunities_get-opportunity', { opportunityId });
  }

  /**
   * Update an opportunity
   */
  async updateOpportunity(opportunityId: string, updates: Partial<OpportunityInput>): Promise<MCPResponse<Opportunity>> {
    return this.callTool<Opportunity>('opportunities_update-opportunity', {
      opportunityId,
      ...updates
    });
  }

  /**
   * Get opportunities for a contact
   */
  async getContactOpportunities(contactId: string): Promise<MCPResponse<{ items: Opportunity[] }>> {
    return this.callTool('opportunities_get-opportunities', { contactId });
  }

  // Tag Management Methods
  
  /**
   * Add tags to a contact
   */
  async addContactTags(contactId: string, tags: string[]): Promise<MCPResponse<{ success: boolean }>> {
    return this.callTool('contacts_add-tags', { contactId, tags });
  }

  /**
   * Remove tags from a contact
   */
  async removeContactTags(contactId: string, tags: string[]): Promise<MCPResponse<{ success: boolean }>> {
    return this.callTool('contacts_remove-tags', { contactId, tags });
  }

  // Helper Methods for Chat Integration
  
  /**
   * Find or create a conversation thread for a contact
   */
  async findOrCreateConversation(contactId: string, channel: string = 'chat'): Promise<MCPResponse<{ conversationId: string; isNew: boolean }>> {
    try {
      // First, try to find an existing conversation
      const searchResult = await this.searchConversations({
        contactId,
        limit: 1,
        sort: 'desc'
      });

      if (searchResult.success && searchResult.data?.items && searchResult.data.items.length > 0) {
        const existingConversation = searchResult.data.items[0];
        return {
          success: true,
          data: {
            conversationId: existingConversation.id,
            isNew: false
          }
        };
      }

      // If no existing conversation, create one by sending the first message
      const firstMessageResult = await this.sendMessage({
        contactId,
        body: 'Chat session started. How can I help you today?',
        channel: channel as 'chat' | 'sms' | 'email' | 'whatsapp' | 'facebook' | 'instagram'
      });

      if (firstMessageResult.success && firstMessageResult.data) {
        const conversationId = firstMessageResult.data.conversationId || 
                              (firstMessageResult.data as { id?: string }).id;
        
        if (conversationId) {
          return {
            success: true,
            data: {
              conversationId,
              isNew: true
            }
          };
        }
      }

      return {
        success: false,
        error: 'Failed to create conversation thread'
      };
    } catch (error) {
      console.error('[CRM MCP] Error in findOrCreateConversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in conversation creation'
      };
    }
  }

  /**
   * Find or create contact by email/phone
   */
  async findOrCreateContact(contactData: ContactInput): Promise<MCPResponse<{ contact: Contact; isNew: boolean }>> {
    try {
      // First try to find existing contact
      if (contactData.email || contactData.phone) {
        const searchResult = await this.searchContact(contactData.email, contactData.phone);
        
        if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
          return {
            success: true,
            data: {
              contact: searchResult.data[0],
              isNew: false
            }
          };
        }
      }

      // Create new contact if not found
      const createResult = await this.upsertContact(contactData);
      
      if (createResult.success && createResult.data) {
        return {
          success: true,
          data: {
            contact: createResult.data,
            isNew: true
          }
        };
      }

      return {
        success: false,
        error: 'Failed to create contact'
      };
    } catch (error) {
      console.error('[CRM MCP] Error in findOrCreateContact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in contact creation'
      };
    }
  }

  /**
   * Health check method to test API connectivity
   */
  async healthCheck(): Promise<MCPResponse<{ status: string; timestamp: string; locationId: string }>> {
    try {
      // Try to get contacts with limit 1 as a simple health check
      const result = await this.getContacts({ limit: 1 });
      
      if (result.success) {
        return {
          success: true,
          data: {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            locationId: this.config.locationId
          }
        };
      }
      
      return {
        success: false,
        error: 'Health check failed: ' + result.error
      };
    } catch (error) {
      return {
        success: false,
        error: 'Health check error: ' + (error instanceof Error ? error.message : 'Unknown error')
      };
    }
  }
}

// Factory function to create CRM MCP client
export function createCRMClient(config?: Partial<CRMConfig>): CRMMCPClient {
  const fullConfig: CRMConfig = {
    mcpUrl: config?.mcpUrl || process.env.GHL_MCP_BASE_URL || 'https://services.leadconnectorhq.com/mcp/',
    pit: config?.pit || process.env.GHL_PRIVATE_INTEGRATION_TOKEN || '',
    locationId: config?.locationId || process.env.GHL_LOCATION_ID || ''
  };

  // Validate configuration (now optional since MCP server may handle authentication)
  if (fullConfig.pit && !fullConfig.pit.trim()) {
    console.warn('[CRM MCP] Empty integration token provided, MCP server should handle authentication');
  }
  
  if (fullConfig.locationId && !fullConfig.locationId.trim()) {
    console.warn('[CRM MCP] Empty location ID provided, MCP server should handle location context');
  }

  // Only validate if we're not using server-side authentication
  if (!fullConfig.mcpUrl || !fullConfig.mcpUrl.trim()) {
    throw new Error('MCP URL is required (GHL_MCP_BASE_URL environment variable or mcpUrl config)');
  }

  return new CRMMCPClient(fullConfig);
}

// Utility function to parse MCP envelope responses (for SSE format)
export function parseMcpEnvelope(status: number, rawText: string) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error(`Empty MCP response [${status}]`);
  }
  
  const ssePrefix = 'event: message\ndata: ';
  const body = rawText.startsWith(ssePrefix) ? rawText.slice(ssePrefix.length).trim() : rawText;

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Invalid MCP response [${status}]: ${body.slice(0, 240)}...`);
  }
  
  const base = (parsed as { result?: unknown } | undefined)?.result ?? parsed;

  // Unwrap nested { content:[{ type:'text', text:'{...}' }]}
  let current: unknown = base;
  for (let i = 0; i < 5; i++) {
    const currentObj = current as { content?: Array<{ text?: string }> };
    const textNode = currentObj?.content?.[0]?.text;
    if (!textNode || typeof textNode !== 'string') break;
    try {
      current = JSON.parse(textNode);
    } catch {
      break;
    }
  }

  const currentObj = current as { error?: { message?: string } };
  if (currentObj?.error) {
    const msg = currentObj.error?.message || 'Unknown MCP error';
    throw new Error(`MCP Error: ${msg}`);
  }

  return current;
}

