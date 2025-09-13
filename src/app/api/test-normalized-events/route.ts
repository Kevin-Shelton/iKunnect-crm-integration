// Test endpoint for normalized message format
export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import { normalizeMessages } from '@/lib/normalize';
import { ChatEventStorage } from '@/lib/storage';
import type { GhlMessage } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    // Create test payload with normalized GHL message format
    const testMessages: GhlMessage[] = [
      {
        id: 'msg_norm_1',
        direction: 'inbound',
        type: 29, // TYPE_LIVE_CHAT
        messageType: 'TYPE_LIVE_CHAT',
        body: 'Hello, I need help with my order',
        conversationId: 'conv_normalized_test',
        dateAdded: new Date().toISOString(),
        locationId: 'loc_123',
        contactId: 'contact_test_123',
        source: null
      },
      {
        id: 'msg_norm_2',
        direction: 'outbound',
        type: 29,
        messageType: 'TYPE_LIVE_CHAT',
        body: 'Hello! I\'d be happy to help you with your order. Can you please provide your order number?',
        conversationId: 'conv_normalized_test',
        dateAdded: new Date(Date.now() + 1000).toISOString(),
        locationId: 'loc_123',
        contactId: 'contact_test_123',
        source: 'ai' // This will be classified as ai_agent
      },
      {
        id: 'msg_norm_3',
        direction: 'inbound',
        type: 29,
        body: 'My order number is #12345',
        conversationId: 'conv_normalized_test',
        dateAdded: new Date(Date.now() + 2000).toISOString(),
        locationId: 'loc_123',
        contactId: 'contact_test_123',
        source: null
      },
      {
        id: 'msg_norm_4',
        direction: 'inbound',
        type: 30, // TYPE_LIVE_CHAT_INFO_MESSAGE
        messageType: 'TYPE_LIVE_CHAT_INFO_MESSAGE',
        body: 'Customer joined the chat',
        conversationId: 'conv_normalized_test',
        dateAdded: new Date(Date.now() + 3000).toISOString(),
        locationId: 'loc_123',
        contactId: 'contact_test_123',
        source: null
      },
      {
        id: 'msg_norm_5',
        direction: 'outbound',
        type: 29,
        body: 'Thank you! I can see your order #12345. It looks like it was shipped yesterday and should arrive within 2-3 business days.',
        conversationId: 'conv_normalized_test',
        dateAdded: new Date(Date.now() + 4000).toISOString(),
        locationId: 'loc_123',
        contactId: 'contact_test_123',
        source: 'ai'
      }
    ];

    // Normalize the messages
    const normalizedMessages = normalizeMessages(testMessages, 'conv_normalized_test');

    // Store each normalized message
    let storedCount = 0;
    for (const message of normalizedMessages) {
      if (message.conversationId) {
        const chatEvent = {
          conversationId: message.conversationId,
          contactId: 'contact_test_123',
          direction: message.direction,
          actor: message.sender === 'contact' ? 'customer' : 
                 message.sender === 'ai_agent' ? 'ai' : 
                 message.sender === 'human_agent' ? 'agent' : 'system',
          text: message.text,
          timestamp: message.createdAt || new Date().toISOString(),
          correlationId: message.id
        };

        ChatEventStorage.addEvent(chatEvent);
        storedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Test normalized events created successfully',
      messagesProcessed: normalizedMessages.length,
      messagesStored: storedCount,
      conversationId: 'conv_normalized_test',
      normalizedMessages: normalizedMessages.map(m => ({
        id: m.id,
        sender: m.sender,
        category: m.category,
        text: m.text.substring(0, 50) + (m.text.length > 50 ? '...' : '')
      })),
      instructions: 'Check the main application at http://localhost:3002 to see the conversation appear'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

