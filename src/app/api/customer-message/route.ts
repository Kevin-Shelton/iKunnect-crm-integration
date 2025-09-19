import { NextRequest, NextResponse } from 'next/server';
import { insertChatEvent } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { text, conversation_id, customer_id } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ 
        error: 'Message text is required' 
      }, { status: 400 });
    }

    // Generate conversation ID if not provided
    const convId = conversation_id || `conv_${Date.now()}`;
    const custId = customer_id || `customer_${Date.now()}`;

    // Store the customer message in Supabase
    const chatEvent = {
      conversation_id: convId,
      type: 'inbound',
      text: text.trim(),
      payload: {
        text: text.trim(),
        type: 'inbound',
        channel: 'webchat',
        conversation_id: convId,
        customer_id: custId,
        timestamp: new Date().toISOString(),
        source: 'customer_chat'
      }
    };

    // Store in database
    if (insertChatEvent) {
      try {
        await insertChatEvent(chatEvent);
        console.log('Customer message stored in database');
      } catch (dbError) {
        console.error('Failed to store message in database:', dbError);
        // Continue anyway - don't fail the whole request
      }
    }

    // Send to n8n webhook (you need to provide your n8n webhook URL)
    const n8nWebhookUrl = process.env.N8N_CUSTOMER_WEBHOOK_URL;
    
    if (n8nWebhookUrl) {
      try {
        const webhookPayload = {
          text: text.trim(),
          conversation_id: convId,
          customer_id: custId,
          type: 'customer_message',
          channel: 'webchat',
          timestamp: new Date().toISOString(),
          source: 'customer_chat_interface'
        };

        const webhookResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload)
        });

        if (webhookResponse.ok) {
          console.log('Message sent to n8n webhook successfully');
          
          // Try to get response from n8n
          const n8nResponse = await webhookResponse.text();
          let agentResponse = null;
          
          try {
            const parsedResponse = JSON.parse(n8nResponse);
            if (parsedResponse.response || parsedResponse.message) {
              agentResponse = parsedResponse.response || parsedResponse.message;
            }
          } catch (parseError) {
            // If n8n returns plain text, use that
            if (n8nResponse && n8nResponse.trim()) {
              agentResponse = n8nResponse.trim();
            }
          }

          return NextResponse.json({
            success: true,
            message: 'Message sent successfully',
            conversation_id: convId,
            agent_response: agentResponse
          });
        } else {
          console.error('Failed to send to n8n webhook:', webhookResponse.statusText);
          return NextResponse.json({
            success: true,
            message: 'Message received but n8n webhook failed',
            conversation_id: convId,
            warning: 'n8n webhook not responding'
          });
        }
      } catch (webhookError) {
        console.error('Error calling n8n webhook:', webhookError);
        return NextResponse.json({
          success: true,
          message: 'Message received but n8n webhook error',
          conversation_id: convId,
          warning: 'n8n webhook connection failed'
        });
      }
    } else {
      console.warn('N8N_CUSTOMER_WEBHOOK_URL not configured');
      return NextResponse.json({
        success: true,
        message: 'Message received (n8n webhook not configured)',
        conversation_id: convId,
        warning: 'n8n webhook URL not set'
      });
    }

  } catch (error) {
    console.error('Customer message API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
