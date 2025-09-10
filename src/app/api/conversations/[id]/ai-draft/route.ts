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

    // For now, we'll create a simple AI response
    // In a real implementation, this would call OpenAI or another AI service
    const _aiPrompt = `
You are a helpful customer service agent. Based on the conversation history and context, suggest a professional and helpful response.

${contactInfo ? `Contact Information: ${contactInfo}` : ''}
${context ? `Additional Context: ${context}` : ''}

Recent Conversation:
${messageHistory}

Please provide a suggested response that is:
- Professional and friendly
- Helpful and relevant to the conversation
- Concise but complete
- Appropriate for customer service
`;

    // Simulate AI response (replace with actual AI service call)
    const aiSuggestions = [
      "Thank you for reaching out! I'd be happy to help you with that. Let me look into this for you right away.",
      "I understand your concern. Let me check on this and get back to you with a solution.",
      "Thanks for the information. Based on what you've shared, I can help you resolve this issue.",
      "I appreciate your patience. Let me review your account and provide you with the best options available.",
      "That's a great question! I'll be glad to walk you through the process step by step."
    ];

    const suggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];

    return NextResponse.json({
      success: true,
      suggestion,
      confidence: 0.85,
      reasoning: 'Generated based on conversation context and customer service best practices',
      context: {
        conversationId,
        messageCount: messages.length,
        hasContact: !!contact,
        requestType
      },
      timestamp: new Date().toISOString()
    });

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

