import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { upsertMessages } from '@/lib/chatStorage';

/**
 * GHL Webhook Handler
 * Receives messages from GHL (customer, AI agent, human agent) and syncs to app
 */
export async function POST(request: NextRequest) {
  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_TOKEN!
  );
  try {
    console.log('[GHL Webhook] ========================================');
    console.log('[GHL Webhook] Received webhook call');
    
    // Parse the webhook payload
    const payload = await request.json();
    console.log('[GHL Webhook] Payload:', JSON.stringify(payload, null, 2));

    // Extract relevant data from GoHighLevel webhook
    const {
      type,
      contactId,
      locationId,
      conversationId,
      messageId,
      body: messageBody,
      message,
      direction,
      contentType,
      attachments,
      userId,
      dateAdded,
      contact,
      contactName,
      fullName,
      firstName,
      lastName,
      email,
      phone
    } = payload;

    // Extract contact information from various possible payload structures
    const extractedContact = {
      id: contactId || contact?.id || null,
      name: contactName || fullName || contact?.name || contact?.fullName || 
            (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName) || 
            (contact?.firstName && contact?.lastName ? `${contact.firstName} ${contact.lastName}` : 
            contact?.firstName || contact?.lastName) || null,
      email: email || contact?.email || null,
      phone: phone || contact?.phone || null
    };

    console.log('[GHL Webhook] Extracted contact info:', extractedContact);
    console.log('[GHL Webhook] Raw contactId from payload:', contactId);
    console.log('[GHL Webhook] Contact object from payload:', contact);

    // Validate minimum required contact data
    if (!extractedContact.id) {
      console.log('[GHL Webhook] ❌ Rejecting - no contact ID provided');
      return NextResponse.json({ 
        status: 'rejected', 
        reason: 'missing contact ID',
        payload: { contactId: extractedContact.id }
      }, { status: 400 });
    }

    // Warn if contact name is missing (will create "Visitor XXXX" entries)
    if (!extractedContact.name) {
      console.warn('[GHL Webhook] ⚠️ Warning - no contact name provided, will use fallback naming');
    }

    const messageText = messageBody || message || '';

    if (!messageText) {
      console.log('[GHL Webhook] Skipping - no message text');
      return NextResponse.json({ status: 'ignored', reason: 'missing message text' });
    }

    // Filter out GHL system messages that shouldn't be stored
    // NOTE: "initiating chat" is NOT filtered - it's needed to trigger the workflow
    const systemMessagesToFilter = [
      'Customer started a new chat',
      'Customer started a new chat.',
      'Conversation started',
      'Chat started'
    ];
    
    // Allow "initiating chat" through - it triggers the greeting workflow
    if (messageText.toLowerCase() !== 'initiating chat' && 
        systemMessagesToFilter.some(sysMsg => messageText.toLowerCase().includes(sysMsg.toLowerCase()))) {
      console.log('[GHL Webhook] Skipping system message:', messageText);
      return NextResponse.json({ status: 'ignored', reason: 'system message filtered' });
    }
    
    // Special handling for "initiating chat" - store it but mark it for filtering in UI
    const isInitiatingMessage = messageText.toLowerCase() === 'initiating chat';
    if (isInitiatingMessage) {
      console.log('[GHL Webhook] Detected initiating chat message - will store but hide from UI');
    }

    // Detect system greeting messages (automated welcome messages)
    // These should be stored but marked as 'system' type for special styling
    const isSystemGreeting = 
      messageText.toLowerCase().includes('thank you for visiting') ||
      messageText.toLowerCase().includes('while we direct you to') ||
      messageText.toLowerCase().includes('how can we help you') ||
      (messageText.toLowerCase().includes('hi ') && messageText.toLowerCase().includes('thank you')) ||
      (direction === 'outbound' && !userId && messageText.length > 50 && messageText.includes('?'));
    
    if (isSystemGreeting) {
      console.log('[GHL Webhook] Detected system greeting message:', messageText.substring(0, 50));
    }

    // Generate a fallback message ID if not provided by GHL
    const effectiveMessageId = messageId || `msg_${extractedContact.id}_${Date.now()}_${messageText.substring(0, 20).replace(/\s/g, '_')}`;
    console.log('[GHL Webhook] Message ID:', effectiveMessageId, '(original:', messageId, ')');

    // ALWAYS look up existing conversation to ensure message grouping
    // Strategy: Try contactId first, then GHL conversationId, then create new
    let finalConversationId = conversationId;
    let foundExisting = false;
    
    // Strategy 1: Look up by contactId (most reliable for grouping)
    if (extractedContact.id) {
      console.log('[GHL Webhook] 🔍 Looking up existing conversation by contactId:', extractedContact.id);
      
      try {
        const { data, error } = await supabase
          .from('chat_events')
          .select('conversation_id, payload')
          .or(`payload->>contactId.eq.${extractedContact.id},payload->contact->>id.eq.${extractedContact.id}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.conversation_id) {
          finalConversationId = data.conversation_id;
          foundExisting = true;
          console.log('[GHL Webhook] ✅ Found existing conversation by contactId:', finalConversationId);
          if (conversationId && conversationId !== finalConversationId) {
            console.log('[GHL Webhook] ⚠️ GHL conversationId differs:', conversationId, '- using existing:', finalConversationId);
          }
        }
      } catch (error) {
        console.error('[GHL Webhook] Error querying by contactId:', error);
      }
    }
    
    // Strategy 2: If not found by contactId, try looking up by GHL conversationId
    if (!foundExisting && conversationId) {
      console.log('[GHL Webhook] 🔍 Looking up existing conversation by GHL conversationId:', conversationId);
      
      try {
        const { data, error } = await supabase
          .from('chat_events')
          .select('conversation_id, payload')
          .or(`conversation_id.eq.${conversationId},payload->conversation->>id.eq.${conversationId}`)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.conversation_id) {
          finalConversationId = data.conversation_id;
          foundExisting = true;
          console.log('[GHL Webhook] ✅ Found existing conversation by GHL conversationId:', finalConversationId);
        }
      } catch (error) {
        console.error('[GHL Webhook] Error querying by conversationId:', error);
      }
    }
    
    // Strategy 3: Create new conversation if nothing found
    if (!foundExisting) {
      finalConversationId = conversationId || extractedContact.id || `conv_${Date.now()}`;
      console.log('[GHL Webhook] 🆕 No existing conversation found, creating new with ID:', finalConversationId);
    }
    
    if (!finalConversationId) {
      console.log('[GHL Webhook] ⚠️ No valid conversation identifier');
    }

    if (!finalConversationId) {
      console.log('[GHL Webhook] ❌ Skipping - no valid conversation identifier');
      return NextResponse.json({ status: 'ignored', reason: 'missing conversation identifier' });
    }

    console.log('[GHL Webhook] Processing message:', {
      originalConversationId: conversationId,
      finalConversationId,
      contactId: extractedContact.id,
      contactName: extractedContact.name,
      direction,
      type,
      messageText: messageText.substring(0, 100) + '...'
    });

    // Determine sender type based on direction and userId
    let sender: 'contact' | 'human_agent' | 'ai_agent' | 'system' = 'contact';
    let eventType = 'inbound';
    
    // Override sender for system greeting messages
    if (isSystemGreeting) {
      sender = 'system';
      eventType = 'outbound';
    }
    
    // If direction is provided, use it (unless already set as system greeting)
    else if (direction === 'outbound') {
      // Outbound messages could be from AI agent or human agent
      if (userId) {
        sender = 'human_agent';
        eventType = 'outbound';
      } else {
        // No userId means it's from AI agent
        sender = 'ai_agent';
        eventType = 'outbound';
      }
    } else if (direction === 'inbound') {
      sender = 'contact';
      eventType = 'inbound';
    } else {
      // If direction is missing, assume it's from customer (workflow default)
      // Unless there's a userId, which means it's from an agent
      if (userId) {
        sender = 'human_agent';
        eventType = 'outbound';
      } else {
        sender = 'contact';
        eventType = 'inbound';
      }
    }

    console.log('[GHL Webhook] Determined sender:', sender, 'eventType:', eventType);

    // Save to Supabase chat_events table
    try {
      // Check if this message already exists (deduplication)
      const { data: existingMessage, error: checkError } = await supabase
        .from('chat_events')
        .select('id, message_id')
        .eq('message_id', effectiveMessageId)
        .maybeSingle();

      if (existingMessage) {
        console.log('[GHL Webhook] ⚠️ Message already exists, skipping:', effectiveMessageId);
        return NextResponse.json({ 
          status: 'skipped', 
          reason: 'duplicate message',
          messageId: effectiveMessageId
        });
      }
      
      console.log('[GHL Webhook] ✅ Message is new, proceeding with insert');

      // Determine event type based on sender
      let dbType: 'inbound' | 'agent_send' | 'ai_agent_send' | 'human_agent_send' | 'admin';
      if (sender === 'contact') {
        dbType = 'inbound';
      } else if (sender === 'ai_agent') {
        dbType = 'ai_agent_send';
      } else if (sender === 'human_agent') {
        dbType = 'human_agent_send';
      } else if (sender === 'system') {
        dbType = 'admin'; // Use 'admin' type for system greetings
      } else {
        dbType = 'agent_send'; // fallback
      }

      const chatEvent = {
        conversation_id: finalConversationId,
        type: dbType,
        message_id: effectiveMessageId,
        text: messageText,
        payload: {
          text: messageText,
          type: eventType,
          channel: 'Live_Chat',
          conversation: { id: finalConversationId },
          contact: extractedContact,
          contactId: extractedContact.id,
          timestamp: dateAdded || new Date().toISOString(),
          source: 'ghl_webhook',
          sender,
          messageId: effectiveMessageId,
          direction,
          contentType,
          attachments,
          userId
        },
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('chat_events')
        .insert([chatEvent])
        .select();

      if (error) {
        console.error('[GHL Webhook] Supabase insert error:', error);
      } else {
        console.log('[GHL Webhook] Message saved to Supabase:', data?.[0]?.id);
      }
    } catch (error) {
      console.error('[GHL Webhook] Error saving to Supabase:', error);
    }

    // Add to in-memory chat storage for real-time updates
    try {
      upsertMessages(finalConversationId, [{
        id: effectiveMessageId,
        text: messageText,
        sender: sender,
        createdAt: dateAdded || new Date().toISOString(),
        conversationId: finalConversationId,
        direction: direction || 'inbound',
        category: 'chat',
        raw: payload as any
      }]);
      console.log('[GHL Webhook] Message added to in-memory storage');
    } catch (error) {
      console.error('[GHL Webhook] Error adding to in-memory storage:', error);
    }

    return NextResponse.json({ 
      status: 'processed',
      messageId,
      conversationId: finalConversationId,
      originalConversationId: conversationId,
      sender,
      synced: true,
      lookedUp: conversationId !== finalConversationId
    });

  } catch (error) {
    console.error('[GHL Webhook] Error processing webhook:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Handle GET requests for webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    // GoHighLevel webhook verification
    return new NextResponse(challenge, { status: 200 });
  }
  
  return NextResponse.json({ 
    status: 'GoHighLevel webhook endpoint',
    timestamp: new Date().toISOString()
  });
}
