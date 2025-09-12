import { NextRequest, NextResponse } from 'next/server';
import { createCRMClient } from '@/lib/mcp';
import OpenAI from 'openai';

// Initialize OpenAI client conditionally
const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_TOKEN;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({
    apiKey,
  });
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const body = await request.json();
    
    const { context, requestType = 'draft' } = body;

    // Validate OpenAI configuration
    const openai = getOpenAIClient();
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
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

    // Get recent messages for context (conversation details will be in the messages)
    const messagesResult = await crmClient.getMessages(conversationId);

    if (!messagesResult.success) {
      return NextResponse.json(
        { error: 'Messages not found', details: messagesResult.error },
        { status: 404 }
      );
    }

    const messages = messagesResult.data?.messages || [];
    
    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages found in conversation' },
        { status: 404 }
      );
    }

    // Get contact information for better context
    let contact = null;
    const contactId = messages[0]?.contactId;
    if (contactId) {
      const contactResult = await crmClient.getContact(contactId);
      if (contactResult.success) {
        contact = contactResult.data;
      }
    }

    // Build context for AI
    const messageHistory = messages
      .slice(-5) // Last 5 messages
      .map(msg => `${msg.direction === 'inbound' ? 'Customer' : 'Agent'}: ${msg.body || 'No content'}`)
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
      const response = await openai.responses.create({
        prompt: {
          id: process.env.OPENAI_PROMPT_ID!,
          version: "1"
        },
        input: aiContext
      });

      const suggestion = (response as { response?: string; choices?: Array<{ message?: { content?: string } }> }).response || 
                        (response as { response?: string; choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content;

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

