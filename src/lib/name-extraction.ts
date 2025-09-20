// Utility functions for extracting customer names from conversation data

export function extractCustomerName(conversationId: string, messages: any[]): string {
  // Try to extract name from various sources
  
  // 1. Look for explicit name introductions in messages
  const nameFromMessages = extractNameFromMessages(messages);
  if (nameFromMessages) {
    return nameFromMessages;
  }
  
  // 2. Look for email addresses and extract name part
  const nameFromEmail = extractNameFromEmail(messages);
  if (nameFromEmail) {
    return nameFromEmail;
  }
  
  // 3. Look for phone number patterns and create friendly name
  const nameFromPhone = extractNameFromPhone(messages);
  if (nameFromPhone) {
    return nameFromPhone;
  }
  
  // 4. Fallback to visitor pattern with last 4 digits of conversation ID
  return `Visitor ${conversationId.slice(-4)}`;
}

function extractNameFromMessages(messages: any[]): string | null {
  if (!messages || messages.length === 0) return null;
  
  // Look for common name introduction patterns
  const namePatterns = [
    /my name is ([a-zA-Z\s]+)/i,
    /i'm ([a-zA-Z\s]+)/i,
    /i am ([a-zA-Z\s]+)/i,
    /this is ([a-zA-Z\s]+)/i,
    /call me ([a-zA-Z\s]+)/i,
    /^([a-zA-Z\s]+) here$/i,
    /^hi,?\s*i'm\s+([a-zA-Z\s]+)/i,
    /^hello,?\s*my name is\s+([a-zA-Z\s]+)/i
  ];
  
  for (const message of messages) {
    if (message.type === 'inbound' && message.text) {
      for (const pattern of namePatterns) {
        const match = message.text.match(pattern);
        if (match && match[1]) {
          const name = match[1].trim();
          // Validate name (2-30 characters, only letters and spaces)
          if (name.length >= 2 && name.length <= 30 && /^[a-zA-Z\s]+$/.test(name)) {
            return capitalizeWords(name);
          }
        }
      }
    }
  }
  
  return null;
}

function extractNameFromEmail(messages: any[]): string | null {
  if (!messages || messages.length === 0) return null;
  
  const emailPattern = /([a-zA-Z0-9._%+-]+)@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  
  for (const message of messages) {
    if (message.text) {
      const emailMatch = message.text.match(emailPattern);
      if (emailMatch && emailMatch[0]) {
        const emailPart = emailMatch[0].split('@')[0];
        // Convert email username to readable name
        const name = emailPart
          .replace(/[._-]/g, ' ')
          .replace(/\d+/g, '')
          .trim();
        
        if (name.length >= 2 && name.length <= 20) {
          return capitalizeWords(name);
        }
      }
    }
  }
  
  return null;
}

function extractNameFromPhone(messages: any[]): string | null {
  if (!messages || messages.length === 0) return null;
  
  const phonePattern = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
  
  for (const message of messages) {
    if (message.text) {
      const phoneMatch = message.text.match(phonePattern);
      if (phoneMatch) {
        const lastFour = phoneMatch[4];
        return `Caller ${lastFour}`;
      }
    }
  }
  
  return null;
}

function capitalizeWords(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Get all messages for a conversation to help with name extraction
export async function getConversationMessages(conversationId: string): Promise<any[]> {
  // This would typically fetch from Supabase, but for now return empty array
  // Will be implemented when we have the message fetching logic
  return [];
}
