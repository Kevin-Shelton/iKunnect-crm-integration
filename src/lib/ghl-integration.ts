// GoHighLevel integration via n8n MCP for contact management and identification

interface GHLContact {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customFields?: Record<string, any>;
  tags?: string[];
  source?: string;
  dateAdded?: string;
  lastActivity?: string;
}

interface ContactIdentificationResult {
  exists: boolean;
  contact?: GHLContact;
  confidence: 'high' | 'medium' | 'low';
  identificationMethod?: 'phone' | 'email' | 'name' | 'none';
  needsVerification: boolean;
}

interface ContactCreationData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source: string;
  tags?: string[];
  customFields?: Record<string, any>;
}

class GHLIntegrationService {
  private mcpEndpoint = '/api/mcp/ghl';

  /**
   * Identify a contact based on available information
   * This is the first step when a customer initiates chat
   */
  async identifyContact(identificationData: {
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    conversationId: string;
  }): Promise<ContactIdentificationResult> {
    try {
      console.log('[GHL] Attempting to identify contact:', { 
        hasPhone: !!identificationData.phone,
        hasEmail: !!identificationData.email,
        hasName: !!(identificationData.firstName || identificationData.lastName),
        conversationId: identificationData.conversationId
      });

      // Try to find contact using available data
      const searchResult = await this.searchContacts(identificationData);
      
      if (searchResult.contacts && searchResult.contacts.length > 0) {
        const contact = searchResult.contacts[0];
        const confidence = this.calculateIdentificationConfidence(contact, identificationData);
        
        return {
          exists: true,
          contact,
          confidence,
          identificationMethod: this.getIdentificationMethod(contact, identificationData),
          needsVerification: confidence === 'low'
        };
      }

      return {
        exists: false,
        confidence: 'low',
        needsVerification: true
      };

    } catch (error) {
      console.error('[GHL] Error identifying contact:', error);
      return {
        exists: false,
        confidence: 'low',
        needsVerification: true
      };
    }
  }

  /**
   * Search for contacts in GHL using n8n MCP
   */
  private async searchContacts(searchData: {
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  }): Promise<{ contacts: GHLContact[] }> {
    try {
      const response = await fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'search_contacts',
          data: searchData
        })
      });

      if (!response.ok) {
        throw new Error(`GHL search failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[GHL] Search contacts error:', error);
      return { contacts: [] };
    }
  }

  /**
   * Create a new contact in GHL
   */
  async createContact(contactData: ContactCreationData): Promise<GHLContact | null> {
    try {
      console.log('[GHL] Creating new contact:', {
        hasPhone: !!contactData.phone,
        hasEmail: !!contactData.email,
        hasName: !!(contactData.firstName || contactData.lastName),
        source: contactData.source
      });

      const response = await fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_contact',
          data: {
            ...contactData,
            tags: [...(contactData.tags || []), 'chat-customer', 'ikunnect-chat'],
            customFields: {
              ...contactData.customFields,
              chatSource: 'iKunnect Chat System',
              firstContactDate: new Date().toISOString()
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GHL create contact failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[GHL] Contact created successfully:', result.contact?.id);
      return result.contact;

    } catch (error) {
      console.error('[GHL] Error creating contact:', error);
      return null;
    }
  }

  /**
   * Update an existing contact in GHL
   */
  async updateContact(contactId: string, updateData: Partial<ContactCreationData>): Promise<GHLContact | null> {
    try {
      const response = await fetch(this.mcpEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_contact',
          data: {
            contactId,
            ...updateData
          }
        })
      });

      if (!response.ok) {
        throw new Error(`GHL update contact failed: ${response.status}`);
      }

      const result = await response.json();
      return result.contact;

    } catch (error) {
      console.error('[GHL] Error updating contact:', error);
      return null;
    }
  }

  /**
   * Calculate confidence level for contact identification
   */
  private calculateIdentificationConfidence(
    contact: GHLContact, 
    identificationData: any
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Phone number match (highest confidence)
    if (identificationData.phone && contact.phone === identificationData.phone) {
      score += 50;
    }

    // Email match (high confidence)
    if (identificationData.email && contact.email === identificationData.email) {
      score += 40;
    }

    // Name match (medium confidence)
    if (identificationData.firstName && contact.firstName === identificationData.firstName) {
      score += 20;
    }
    if (identificationData.lastName && contact.lastName === identificationData.lastName) {
      score += 20;
    }

    if (score >= 50) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  /**
   * Determine how the contact was identified
   */
  private getIdentificationMethod(
    contact: GHLContact, 
    identificationData: any
  ): 'phone' | 'email' | 'name' | 'none' {
    if (identificationData.phone && contact.phone === identificationData.phone) {
      return 'phone';
    }
    if (identificationData.email && contact.email === identificationData.email) {
      return 'email';
    }
    if ((identificationData.firstName && contact.firstName === identificationData.firstName) ||
        (identificationData.lastName && contact.lastName === identificationData.lastName)) {
      return 'name';
    }
    return 'none';
  }

  /**
   * Generate privacy-compliant response for PII requests
   */
  generatePrivacyResponse(requestType: 'phone' | 'email' | 'address' | 'personal'): string {
    const responses = {
      phone: "Due to privacy concerns, we cannot confirm phone numbers without proper identity validation. I'd be happy to help you update your contact information if needed.",
      email: "For privacy and security reasons, we cannot confirm email addresses without identity verification. Would you like to update your email with us?",
      address: "Due to privacy policies, we cannot share address information without proper verification. I can help you update your address if you'd like.",
      personal: "Due to privacy concerns, we cannot confirm personal information without validation of identity. How can I assist you today?"
    };

    return responses[requestType] || responses.personal;
  }

  /**
   * Extract potential identification data from conversation messages
   */
  extractIdentificationData(messages: any[]): {
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  } {
    const identificationData: any = {};

    for (const message of messages) {
      if (message.type === 'inbound' && message.text) {
        const text = message.text.toLowerCase();

        // Extract phone number
        const phoneMatch = text.match(/(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/);
        if (phoneMatch) {
          identificationData.phone = phoneMatch[0].replace(/\D/g, '');
        }

        // Extract email
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
        if (emailMatch) {
          identificationData.email = emailMatch[0];
        }

        // Extract name patterns
        const namePatterns = [
          /my name is ([a-zA-Z\s]+)/i,
          /i'm ([a-zA-Z\s]+)/i,
          /i am ([a-zA-Z\s]+)/i,
          /this is ([a-zA-Z\s]+)/i,
          /call me ([a-zA-Z\s]+)/i
        ];

        for (const pattern of namePatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            const fullName = match[1].trim();
            const nameParts = fullName.split(' ');
            if (nameParts.length >= 1) {
              identificationData.firstName = nameParts[0];
              if (nameParts.length >= 2) {
                identificationData.lastName = nameParts.slice(1).join(' ');
              }
            }
            break;
          }
        }
      }
    }

    return identificationData;
  }
}

// Export singleton instance
export const ghlIntegration = new GHLIntegrationService();

// Export types for use in other modules
export type { GHLContact, ContactIdentificationResult, ContactCreationData };
