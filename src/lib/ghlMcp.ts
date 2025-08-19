// CRM MCP Client Library
import fetch from 'node-fetch';
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
  APIError
} from '../types/crm';

export class CRMMCPClient {
  private config: CRMConfig;
  private headers: Record<string, string>;

  constructor(config: CRMConfig) {
    this.config = config;
    this.headers = {
      'Authorization': `Bearer ${config.pit}`,
      'locationId': config.locationId,
      'Content-Type': 'application/json',
      'User-Agent': 'iKunnect-CRM-Integration/1.0.0'
    };
  }

  /**
   * Generic method to call any MCP tool
   */
  async callTool<T = any>(tool: string, input: Record<string, any> = {}): Promise<MCPResponse<T>> {
    try {
      const payload: MCPToolCall = { tool, input };
      
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
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error(`[CRM MCP] Failed to parse response for ${tool}:`, responseText);
        throw new Error(`Invalid JSON response from MCP ${tool}: ${responseText}`);
      }

      console.log(`[CRM MCP] Tool ${tool} succeeded:`, data);
      
      return {
        success: true,
        data
      };
    } catch (error) {
      console.error(`[CRM MCP] Error calling tool ${tool}:`, error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        data: null
      };
    }
  }

  // Contact Management Methods
  
  /**
   * Create or update a contact
   */
  async upsertContact(contactData: ContactInput): Promise<MCPResponse<Contact>> {
    return this.callTool<Contact>('contacts_upsert-contact', contactData);
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
    const searchParams: any = {};
    if (email) searchParams.email = email;
    if (phone) searchParams.phone = phone;
    
    return this.callTool('contacts_search-contact', searchParams);
  }

  // Conversation Management Methods
  
  /**
   * Search for conversations
   */
  async searchConversations(params: ConversationSearchInput): Promise<MCPResponse<ConversationSearchResponse>> {
    return this.callTool<ConversationSearchResponse>('conversations_search-conversation', params);
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
    return this.callTool<Message>('conversations_send-a-new-message', messageData);
  }

  /**
   * Get conversation details
   */
  async getConversation(conversationId: string): Promise<MCPResponse<any>> {
    return this.callTool('conversations_get-conversation', { conversationId });
  }

  // Opportunity Management Methods
  
  /**
   * Create a new opportunity
   */
  async createOpportunity(opportunityData: OpportunityInput): Promise<MCPResponse<Opportunity>> {
    return this.callTool<Opportunity>('opportunities_create-opportunity', opportunityData);
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
        channel: channel as any
      });

      if (firstMessageResult.success && firstMessageResult.data) {
        const conversationId = firstMessageResult.data.conversationId || 
                              (firstMessageResult.data as any).id;
        
        return {
          success: true,
          data: {
            conversationId,
            isNew: true
          }
        };
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
   * Health check method to test API connectivity
   */
  async healthCheck(): Promise<MCPResponse<any>> {
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
    mcpUrl: config?.mcpUrl || process.env.CRM_MCP_URL || 'https://services.leadconnectorhq.com/mcp/',
    pit: config?.pit || process.env.CRM_PIT || '',
    locationId: config?.locationId || process.env.CRM_LOCATION_ID || ''
  };

  // Validate required configuration
  if (!fullConfig.pit) {
    throw new Error('CRM_PIT environment variable or pit config is required');
  }
  
  if (!fullConfig.locationId) {
    throw new Error('CRM_LOCATION_ID environment variable or locationId config is required');
  }

  return new CRMMCPClient(fullConfig);
}

