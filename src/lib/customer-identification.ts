// Customer identification and verification service
// Handles the conversation flow for identifying unknown customers while protecting PII

import { ghlIntegration, type GHLContact, type ContactIdentificationResult } from './ghl-integration';

interface IdentificationSession {
  conversationId: string;
  status: 'unknown' | 'identifying' | 'verified' | 'failed';
  collectedData: {
    phone?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  attempts: number;
  lastAttempt: string;
  ghlContact?: GHLContact;
  needsVerification: boolean;
}

interface IdentificationResponse {
  shouldRespond: boolean;
  response?: string;
  isComplete: boolean;
  needsMoreInfo: boolean;
  nextStep?: 'phone' | 'email' | 'name' | 'verification';
}

class CustomerIdentificationService {
  private sessions = new Map<string, IdentificationSession>();
  private readonly maxAttempts = 3;

  /**
   * Process a new conversation and determine if customer identification is needed
   */
  async processNewConversation(conversationId: string, messages: any[]): Promise<IdentificationResponse> {
    console.log(`[Customer ID] Processing new conversation: ${conversationId}`);

    // Extract any identification data from existing messages
    const extractedData = ghlIntegration.extractIdentificationData(messages);
    
    // Try to identify the customer
    const identificationResult = await ghlIntegration.identifyContact({
      ...extractedData,
      conversationId
    });

    if (identificationResult.exists && identificationResult.confidence === 'high') {
      // Customer identified with high confidence
      console.log(`[Customer ID] Customer identified with high confidence`);
      this.updateSession(conversationId, {
        status: 'verified',
        ghlContact: identificationResult.contact,
        needsVerification: false
      });

      return {
        shouldRespond: false,
        isComplete: true,
        needsMoreInfo: false
      };
    }

    // Customer not identified or low confidence - start identification process
    this.initializeSession(conversationId, extractedData, identificationResult);
    
    return this.generateIdentificationRequest(conversationId);
  }

  /**
   * Process a customer message during identification
   */
  async processIdentificationMessage(conversationId: string, messageText: string): Promise<IdentificationResponse> {
    const session = this.sessions.get(conversationId);
    if (!session || session.status === 'verified') {
      return { shouldRespond: false, isComplete: true, needsMoreInfo: false };
    }

    // Extract new identification data from the message
    const newData = this.extractDataFromMessage(messageText);
    
    // Update collected data
    const updatedData = { ...session.collectedData, ...newData };
    this.updateSession(conversationId, { collectedData: updatedData });

    // Try identification again with updated data
    const identificationResult = await ghlIntegration.identifyContact({
      ...updatedData,
      conversationId
    });

    if (identificationResult.exists && identificationResult.confidence === 'high') {
      // Successfully identified
      this.updateSession(conversationId, {
        status: 'verified',
        ghlContact: identificationResult.contact,
        needsVerification: false
      });

      return {
        shouldRespond: true,
        response: identificationResult.contact 
          ? this.generateWelcomeMessage(identificationResult.contact)
          : "Hi! Great to hear from you. How can I help you today?",
        isComplete: true,
        needsMoreInfo: false
      };
    }

    // Check if we have enough data to create a new contact
    if (this.hasMinimumDataForContact(updatedData)) {
      const newContact = await ghlIntegration.createContact({
        firstName: updatedData.firstName,
        lastName: updatedData.lastName,
        email: updatedData.email,
        phone: updatedData.phone,
        source: 'iKunnect Chat',
        tags: ['new-chat-customer']
      });

      if (newContact) {
        this.updateSession(conversationId, {
          status: 'verified',
          ghlContact: newContact,
          needsVerification: false
        });

        return {
          shouldRespond: true,
          response: this.generateNewCustomerWelcome(newContact),
          isComplete: true,
          needsMoreInfo: false
        };
      }
    }

    // Still need more information
    session.attempts++;
    if (session.attempts >= this.maxAttempts) {
      this.updateSession(conversationId, { status: 'failed' });
      return {
        shouldRespond: true,
        response: "I understand you'd prefer not to share that information right now. How can I help you today?",
        isComplete: true,
        needsMoreInfo: false
      };
    }

    return this.generateIdentificationRequest(conversationId);
  }

  /**
   * Handle PII-related questions with privacy-compliant responses
   */
  handlePIIRequest(messageText: string): string | null {
    const lowerText = messageText.toLowerCase();
    
    // Phone number confirmation requests
    if (lowerText.includes('confirm') && (lowerText.includes('phone') || lowerText.includes('number'))) {
      return ghlIntegration.generatePrivacyResponse('phone');
    }

    // Email confirmation requests
    if (lowerText.includes('confirm') && lowerText.includes('email')) {
      return ghlIntegration.generatePrivacyResponse('email');
    }

    // Address confirmation requests
    if (lowerText.includes('confirm') && lowerText.includes('address')) {
      return ghlIntegration.generatePrivacyResponse('address');
    }

    // General personal information requests
    if (lowerText.includes('confirm') || lowerText.includes('verify')) {
      return ghlIntegration.generatePrivacyResponse('personal');
    }

    return null;
  }

  /**
   * Get customer information for display (safe for agents)
   */
  getCustomerInfo(conversationId: string): { name: string; contact?: GHLContact } {
    const session = this.sessions.get(conversationId);
    
    if (session?.ghlContact) {
      const contact = session.ghlContact;
      const name = contact.firstName 
        ? `${contact.firstName} ${contact.lastName || ''}`.trim()
        : `Customer ${conversationId.slice(-4)}`;
      
      return { name, contact };
    }

    return { name: `Visitor ${conversationId.slice(-4)}` };
  }

  /**
   * Initialize a new identification session
   */
  private initializeSession(
    conversationId: string, 
    initialData: any, 
    identificationResult: ContactIdentificationResult
  ): void {
    this.sessions.set(conversationId, {
      conversationId,
      status: 'identifying',
      collectedData: initialData,
      attempts: 0,
      lastAttempt: new Date().toISOString(),
      ghlContact: identificationResult.contact,
      needsVerification: identificationResult.needsVerification
    });
  }

  /**
   * Update an existing session
   */
  private updateSession(conversationId: string, updates: Partial<IdentificationSession>): void {
    const session = this.sessions.get(conversationId);
    if (session) {
      this.sessions.set(conversationId, { ...session, ...updates });
    }
  }

  /**
   * Generate appropriate identification request based on what we still need
   */
  private generateIdentificationRequest(conversationId: string): IdentificationResponse {
    const session = this.sessions.get(conversationId);
    if (!session) {
      return { shouldRespond: false, isComplete: false, needsMoreInfo: true };
    }

    const { collectedData } = session;
    
    // Determine what we still need
    if (!collectedData.phone && !collectedData.email) {
      return {
        shouldRespond: true,
        response: "Hi! To better assist you, could you please share your phone number or email address?",
        isComplete: false,
        needsMoreInfo: true,
        nextStep: 'phone'
      };
    }

    if (!collectedData.firstName) {
      return {
        shouldRespond: true,
        response: "Thank you! Could you also share your first name so I can personalize our conversation?",
        isComplete: false,
        needsMoreInfo: true,
        nextStep: 'name'
      };
    }

    // We have basic info but couldn't identify - ask for verification
    return {
      shouldRespond: true,
      response: "Thanks for that information! Let me look you up in our system. How can I help you today?",
      isComplete: false,
      needsMoreInfo: false,
      nextStep: 'verification'
    };
  }

  /**
   * Extract identification data from a single message
   */
  private extractDataFromMessage(messageText: string): any {
    return ghlIntegration.extractIdentificationData([{ type: 'inbound', text: messageText }]);
  }

  /**
   * Check if we have minimum data required to create a contact
   */
  private hasMinimumDataForContact(data: any): boolean {
    return !!(data.phone || data.email) && !!data.firstName;
  }

  /**
   * Generate welcome message for identified customer
   */
  private generateWelcomeMessage(contact: GHLContact): string {
    const name = contact.firstName || 'there';
    return `Hi ${name}! Great to hear from you. How can I help you today?`;
  }

  /**
   * Generate welcome message for new customer
   */
  private generateNewCustomerWelcome(contact: GHLContact): string {
    const name = contact.firstName || 'there';
    return `Hi ${name}! Welcome! I've added you to our system. How can I help you today?`;
  }

  /**
   * Clean up old sessions (call periodically)
   */
  cleanupOldSessions(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [conversationId, session] of this.sessions.entries()) {
      if (new Date(session.lastAttempt).getTime() < cutoff) {
        this.sessions.delete(conversationId);
      }
    }
  }
}

// Export singleton instance
export const customerIdentification = new CustomerIdentificationService();

// Export types
export type { IdentificationSession, IdentificationResponse };
