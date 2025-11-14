/**
 * GHL API Client - Direct API calls using OAuth 2.0 tokens
 * This replaces the n8n webhook approach with direct GHL API integration
 */

import { getTokens } from './ghl-token-storage';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';

/**
 * Get a valid access token for the specified location
 */
async function getAccessToken(locationId: string): Promise<string> {
  const tokens = await getTokens(locationId);
  
  if (!tokens) {
    throw new Error(`No OAuth tokens found for location: ${locationId}`);
  }

  // TODO: Implement token refresh logic if token is expired
  // For now, assume token is valid
  
  return tokens.accessToken;
}

/**
 * Get the default location ID from environment or database
 * In a multi-location setup, this would be determined by the user/context
 */
export async function getDefaultLocationId(): Promise<string> {
  // For now, get the first available location from the database
  const { getAllTokens } = await import('./ghl-token-storage');
  const allTokens = await getAllTokens();
  
  if (allTokens.length === 0) {
    throw new Error('No GHL locations authorized. Please authorize the app first.');
  }
  
  return allTokens[0].locationId;
}

/**
 * Create or update a contact in GHL
 */
export async function upsertContact(params: {
  locationId: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}): Promise<{ contactId: string }> {
  const accessToken = await getAccessToken(params.locationId);
  
  const url = `${GHL_API_BASE}/contacts/`;
  
  const body: any = {
    phone: params.phone,
    locationId: params.locationId,
  };
  
  if (params.email) body.email = params.email;
  if (params.firstName) body.firstName = params.firstName;
  if (params.lastName) body.lastName = params.lastName;
  if (params.name && !params.firstName && !params.lastName) {
    // Split name into first and last if only full name provided
    const nameParts = params.name.split(' ');
    body.firstName = nameParts[0];
    if (nameParts.length > 1) {
      body.lastName = nameParts.slice(1).join(' ');
    }
  }

  console.log('[GHL API] Creating/updating contact:', { 
    phone: params.phone, 
    locationId: params.locationId,
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[GHL API] Contact upsert failed:', errorText);
    
    // Handle duplicate contact error - GHL returns the existing contact ID
    try {
      const errorData = JSON.parse(errorText);
      if (errorData.statusCode === 400 && errorData.message?.includes('duplicated contacts') && errorData.meta?.contactId) {
        console.log('[GHL API] Contact already exists, using existing ID:', errorData.meta.contactId);
        return {
          contactId: errorData.meta.contactId,
        };
      }
    } catch (parseError) {
      // If error parsing fails, continue with original error
    }
    
    throw new Error(`Failed to create/update contact: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[GHL API] Contact created/updated:', data.contact?.id);
  
  return {
    contactId: data.contact?.id || data.id,
  };
}

/**
 * Get or create a conversation for a contact
 */
export async function getOrCreateConversation(params: {
  locationId: string;
  contactId: string;
}): Promise<{ conversationId: string; conversationProviderId?: string }> {
  const accessToken = await getAccessToken(params.locationId);
  
  // First, try to get existing conversations for this contact
  const searchUrl = `${GHL_API_BASE}/conversations/search?locationId=${params.locationId}&contactId=${params.contactId}`;
  
  console.log('[GHL API] Searching for existing conversations:', { contactId: params.contactId });
  
  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Version': '2021-07-28',
    },
  });

  if (searchResponse.ok) {
    const searchData = await searchResponse.json();
    if (searchData.conversations && searchData.conversations.length > 0) {
      const existingConversation = searchData.conversations[0];
      console.log('[GHL API] Found existing conversation:', {
        id: existingConversation.id,
        providerId: existingConversation.conversationProviderId
      });
      return { 
        conversationId: existingConversation.id,
        conversationProviderId: existingConversation.conversationProviderId
      };
    }
  }

  // If no existing conversation, create a new one
  console.log('[GHL API] Creating new conversation for contact:', params.contactId);
  
  const createUrl = `${GHL_API_BASE}/conversations/`;
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify({
      locationId: params.locationId,
      contactId: params.contactId,
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    console.error('[GHL API] Conversation creation failed:', error);
    throw new Error(`Failed to create conversation: ${createResponse.statusText}`);
  }

  const createData = await createResponse.json();
  const conversation = createData.conversation || createData;
  console.log('[GHL API] Conversation created:', {
    id: conversation.id,
    providerId: conversation.conversationProviderId
  });
  
  return {
    conversationId: conversation.id,
    conversationProviderId: conversation.conversationProviderId,
  };
}

/**
 * Send an inbound message to an existing conversation
 * This is the CORRECT endpoint that supports conversationId
 */
export async function sendInboundMessage(params: {
  locationId: string;
  conversationId: string;
  contactId: string;
  message: string;
  type?: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Custom' | 'WebChat' | 'Live_Chat' | 'Call';
  conversationProviderId?: string;
}): Promise<{ messageId: string; conversationId: string }> {
  const accessToken = await getAccessToken(params.locationId);
  
  // Use the inbound message endpoint which supports conversationId
  const url = `${GHL_API_BASE}/conversations/messages/inbound`;
  
  const body: any = {
    type: params.type || 'Live_Chat',
    message: params.message,
    conversationId: params.conversationId, // This is the key parameter!
    contactId: params.contactId,
  };
  
  // Add conversationProviderId if provided
  if (params.conversationProviderId) {
    body.conversationProviderId = params.conversationProviderId;
  }

  console.log('[GHL API] Sending inbound message:', { 
    conversationId: params.conversationId,
    contactId: params.contactId, 
    type: body.type,
    hasProviderId: !!params.conversationProviderId
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-04-15',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[GHL API] Inbound message send failed:', error);
    throw new Error(`Failed to send inbound message: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[GHL API] Inbound message sent successfully:', {
    messageId: data.messageId,
    conversationId: data.conversationId
  });
  
  return {
    messageId: data.messageId,
    conversationId: data.conversationId,
  };
}

/**
 * Send a message to a conversation (OLD METHOD - creates new conversations)
 * Use sendInboundMessage instead for existing conversations
 */
export async function sendMessage(params: {
  locationId: string;
  conversationId: string;
  contactId: string;
  message: string;
  type?: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Live_Chat';
}): Promise<{ messageId: string }> {
  const accessToken = await getAccessToken(params.locationId);
  
  // Correct endpoint: /conversations/messages (not /conversations/{id}/messages)
  const url = `${GHL_API_BASE}/conversations/messages`;
  
  const body: any = {
    type: params.type || 'SMS',
    contactId: params.contactId,
    message: params.message,
    status: 'delivered', // Required by GHL API
  };

  console.log('[GHL API] Sending message:', { contactId: params.contactId, type: body.type });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[GHL API] Message send failed:', error);
    throw new Error(`Failed to send message: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[GHL API] Message sent successfully:', data.messageId || data.id);
  
  return {
    messageId: data.messageId || data.id,
  };
}

/**
 * Complete flow: Create contact, get/create conversation, send message
 */
export async function sendMessageToContact(params: {
  locationId: string;
  phone: string;
  message: string;
  email?: string;
  name?: string;
  type?: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Live_Chat';
}): Promise<{
  contactId: string;
  conversationId: string;
  messageId: string;
}> {
  console.log('[GHL API] Starting complete message flow for phone:', params.phone);
  
  // Step 1: Create or update contact
  const { contactId } = await upsertContact({
    locationId: params.locationId,
    phone: params.phone,
    email: params.email,
    name: params.name,
  });

  // Step 2: Get or create conversation
  const { conversationId } = await getOrCreateConversation({
    locationId: params.locationId,
    contactId,
  });

  // Step 3: Send message
  const { messageId } = await sendMessage({
    locationId: params.locationId,
    conversationId,
    contactId,
    message: params.message,
    type: params.type,
  });

  console.log('[GHL API] Complete flow finished:', { contactId, conversationId, messageId });

  return {
    contactId,
    conversationId,
    messageId,
  };
}
