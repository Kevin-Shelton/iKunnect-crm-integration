import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

// GoHighLevel webhook handler
export async function POST(request: NextRequest) {
  try {
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
      message,
      direction,
      contentType,
      attachments,
      userId,
      dateAdded
    } = payload;

    // Only process incoming messages from customers
    if (direction !== 'inbound' || !message) {
      console.log('[GHL Webhook] Skipping non-inbound message or empty message');
      return NextResponse.json({ status: 'ignored', reason: 'not inbound message' });
    }

    console.log('[GHL Webhook] Processing inbound message:', {
      contactId,
      conversationId,
      message: message.substring(0, 100) + '...'
    });

    // Initialize MCP client
    const crmClient = createCRMClient({
      locationId: locationId || process.env.GHL_LOCATION_ID
    });

    // Get contact information
    let contact;
    try {
      const contactResult = await crmClient.getContact(contactId);
      if (contactResult.success) {
        contact = contactResult.data;
      }
    } catch (error) {
      console.error('[GHL Webhook] Error fetching contact:', error);
    }

    // Process message through OpenAI assistant with MCP
    try {
      // Call OpenAI assistant to process the customer message
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            {
              role: "system",
              content: `You are a customer service assistant for National Lawyers Guild. A customer has sent a message through the chat widget. Use the National_Lawyers tool to process their request and provide appropriate assistance. Customer context: ${contact ? JSON.stringify(contact) : 'No contact info available'}`
            },
            {
              role: "user",
              content: message
            }
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "National_Lawyers",
                description: "Access GoHighLevel CRM data and perform operations for National Lawyers Guild",
                parameters: {
                  type: "object",
                  properties: {
                    action: {
                      type: "string",
                      description: "The action to perform (get_contact, search_cases, update_status, etc.)"
                    },
                    parameters: {
                      type: "object",
                      description: "Parameters for the action"
                    }
                  },
                  required: ["action", "parameters"]
                }
              }
            }
          ],
          tool_choice: "auto"
        })
      });

      if (response.ok) {
        const aiResponse = await response.json();
        console.log('[GHL Webhook] OpenAI response received');
        
        // Extract the AI's response message
        let responseMessage = '';
        if (aiResponse.choices && aiResponse.choices[0] && aiResponse.choices[0].message) {
          responseMessage = aiResponse.choices[0].message.content || 'I received your message and am processing it.';
        }

        // Send response back to GoHighLevel (if you have the API to do so)
        // This would require GHL API integration to send messages back
        console.log('[GHL Webhook] AI Response:', responseMessage);

        // Store conversation data for agent dashboard
        // This could be stored in database, cache, or retrieved from GHL later
        
        return NextResponse.json({ 
          status: 'processed',
          messageId,
          conversationId,
          response: responseMessage
        });
      } else {
        console.error('[GHL Webhook] OpenAI API error:', response.status, response.statusText);
        return NextResponse.json({ 
          status: 'error', 
          error: 'Failed to process with OpenAI' 
        }, { status: 500 });
      }

    } catch (error) {
      console.error('[GHL Webhook] Error processing message:', error);
      return NextResponse.json({ 
        status: 'error', 
        error: 'Failed to process message' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[GHL Webhook] Error parsing webhook:', error);
    return NextResponse.json({ 
      status: 'error', 
      error: 'Invalid webhook payload' 
    }, { status: 400 });
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

