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
  private mcpUrl: string;
  private headers: Record<string, string>;

  constructor(config: CRMConfig) {
    this.config = config;
    this.mcpUrl = 'https://services.leadconnectorhq.com/mcp/';
    
    this.headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': `Bearer ${config.pit}`,
      'locationId': config.locationId
    };
  }

  /**
   * Generic method to call GoHighLevel MCP server
   */
  async callTool<T = unknown>(tool: string, input: Record<string, unknown> = {}): Promise<MCPResponse<T>> {
    try {
      console.log(`[GHL MCP] Calling tool: ${tool}`, { input });

      // Use the exact simple format from GoHighLevel Python example
      const payload = {
        tool: tool,
        input: input
      };

      const response = await fetch(this.mcpUrl, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GHL MCP] Tool ${tool} failed:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: errorText,
          requestPayload: payload,
          requestHeaders: this.headers
        });
        
        throw new Error(`MCP ${tool} failed: ${response.status} ${errorText}`);
      }

      const responseText = await response.text();
      console.log(`[GHL MCP] Tool ${tool} raw response:`, responseText);
      
      // Handle Server-Sent Events format or regular JSON
      let data;
      if (responseText.startsWith('event:')) {
        // Parse SSE format: "event: message\ndata: {...}"
        const lines = responseText.split('\n');
        const dataLine = lines.find(line => line.startsWith('data:'));
        if (dataLine) {
          const jsonData = dataLine.substring(5).trim(); // Remove "data:" prefix
          data = JSON.parse(jsonData);
        } else {
          throw new Error(`No data found in SSE response: ${responseText}`);
        }
      } else {
        // Regular JSON response
        data = JSON.parse(responseText);
      }
      
      console.log(`[GHL MCP] Tool ${tool} parsed data:`, data);
      
      // Handle simple response format as shown in Python example
      if (data.error) {
        throw new Error(`MCP ${tool} failed: ${JSON.stringify(data.error)}`);
      }
      
      return {
        success: true,
        data: data as T
      };

    } catch (error) {
      console.error(`[GHL MCP] Error calling tool ${tool}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Health check using locations_get-location
   */
  async healthCheck(): Promise<MCPResponse<{ success: boolean }>> {
    try {
      // Use locations_get-location as health check with the current location ID
      const locationId = this.headers.locationId;
      const result = await this.callTool('locations_get-location', { locationId });
      
      return {
        success: true,
        data: { success: true }
      };
    } catch (error) {
      throw new Error(`Health check failed: MCP ${error}`);
    }
  }

  // Contact Management Methods
  
  /**
   * Create or update a contact
   */
  async upsertContact(contactData: Partial<Contact>): Promise<MCPResponse<Contact>> {
    return this.callTool<Contact>('contacts_upsert-contact', contactData);
  }

  /**
   * Get a specific contact by ID
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
   * Search for conversations
   */
  async getAllConversations(params: {
    limit?: number;
    startAfter?: string;
  } = {}): Promise<MCPResponse<{ conversations: Conversation[] }>> {
    return this.callTool('conversations_search-conversation', params);
  }

  /**
   * Get messages for a conversation
   */
  async getMessages(conversationId: string): Promise<MCPResponse<{ messages: Message[] }>> {
    return this.callTool('conversations_get-messages', { conversationId });
  }

  /**
   * Send a new message to a conversation
   */
  async sendMessage(messageData: MessageInput): Promise<MCPResponse<Message>> {
    return this.callTool('conversations_send-a-new-message', messageData as unknown as Record<string, unknown>);
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
      const searchResult = await this.getAllConversations({
        limit: 10 // Get recent conversations to find one for this contact
      });

      if (searchResult.success && searchResult.data?.conversations && searchResult.data.conversations.length > 0) {
        const existingConversation = searchResult.data.conversations[0];
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
        const searchResult = await this.getContacts({
          limit: 10 // Get recent contacts to find matching one
        });
        
        if (searchResult.success && searchResult.data && searchResult.data.items && searchResult.data.items.length > 0) {
          return {
            success: true,
            data: {
              contact: searchResult.data.items[0],
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

