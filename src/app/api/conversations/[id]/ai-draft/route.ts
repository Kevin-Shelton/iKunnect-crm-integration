import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    
    const { context, requestType = 'draft' } = body;

    // Validate OpenAI configuration
    if (!process.env.OPENAI_API_TOKEN) {
      return NextResponse.json(
        { error: 'OpenAI API token not configured' },
        { status: 500 }
      );
    }

    if (!process.env.OPENAI_PROMPT_ID) {
      return NextResponse.json(
        { error: 'OpenAI Prompt ID not configured' },
        { status: 500 }
      );
    }

    const crmClient = createCRMClient();

    // Get conversation and recent messages for context
    const [conversationResult, messagesResult] = await Promise.all([
      crmClient.getConversation(conversationId),
      crmClient.getMessages(conversationId, 10) // Get last 10 messages for context
    ]);

    if (!conversationResult.success) {
      return NextResponse.json(
        { error: 'Conversation not found', details: conversationResult.error },
        { status: 404 }
      );
    }

    const conversation = conversationResult.data;
    const messages = messagesResult.success ? messagesResult.data?.items || [] : [];

    // Get contact information for better context
    let contact = null;
    if (conversation?.contactId) {
      const contactResult = await crmClient.getContact(conversation.contactId);
      if (contactResult.success) {
        contact = contactResult.data;
      }
    }

    // Build context for AI
    const messageHistory = messages
      .slice(-5) // Last 5 messages
      .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Agent'}: ${msg.body}`)
      .join('\n');

    const contactInfo = contact ? 
      `Customer: ${contact.name || contact.firstName + ' ' + contact.lastName || 'Unknown'}` +
      (contact.email ? ` (${contact.email})` : '') +
      (contact.phone ? ` (${contact.phone})` : '') : '';

    // Prepare context for the AI prompt
    const aiContext = `
Contact Information: ${contactInfo || 'No contact information available'}
${context ? `Additional Context: ${context}` : ''}

Recent Conversation History:
${messageHistory || 'No recent messages'}

Request Type: ${requestType}
`.trim();

    try {
      // Call OpenAI with the published prompt using the responses API
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: {
            id: process.env.OPENAI_PROMPT_ID,
            version: "1"
          },
          input: aiContext
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const suggestion = data.choices?.[0]?.message?.content || data.response;

      if (!suggestion) {
        throw new Error('No response generated from OpenAI');
      }

      return NextResponse.json({
        success: true,
        suggestion: suggestion.trim(),
        confidence: 0.9,
        reasoning: 'Generated using OpenAI published prompt for customer service',
        context: {
          conversationId,
          messageCount: messages.length,
          hasContact: !!contact,
          requestType,
          promptId: process.env.OPENAI_PROMPT_ID,
          promptVersion: "1"
        },
        timestamp: new Date().toISOString()
      });

    } catch (openaiError) {
      console.error('[API] OpenAI Error:', openaiError);
      
      // Fallback to simple response if OpenAI fails
      const fallbackSuggestions = [
        "Thank you for reaching out! I'd be happy to help you with that. Let me look into this for you right away.",
        "I understand your concern. Let me check on this and get back to you with a solution.",
        "Thanks for the information. Based on what you've shared, I can help you resolve this issue.",
        "I appreciate your patience. Let me review your account and provide you with the best options available.",
        "That's a great question! I'll be glad to walk you through the process step by step."
      ];

      const suggestion = fallbackSuggestions[Math.floor(Math.random() * fallbackSuggestions.length)];

      return NextResponse.json({
        success: true,
        suggestion,
        confidence: 0.6,
        reasoning: 'Fallback response due to AI service unavailability',
        context: {
          conversationId,
          messageCount: messages.length,
          hasContact: !!contact,
          requestType,
          fallback: true,
          error: openaiError instanceof Error ? openaiError.message : 'Unknown OpenAI error'
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('[API] Error generating AI draft:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

