export const runtime = 'nodejs';
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.conversationId) {
      return NextResponse.json({
        ok: false,
        error: 'conversationId is required'
      }, { status: 400 });
    }
    
    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({
        ok: false,
        error: 'messages array is required'
      }, { status: 400 });
    }
    
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        ok: false,
        error: 'OpenAI API key not configured'
      }, { status: 500 });
    }
    
    // Build conversation context
    const conversationContext = body.messages
      .slice(-5) // Last 5 messages for context
      .map((msg: any) => `${msg.sender}: ${msg.text}`)
      .join('\n');
    
    const prompt = `You are an AI assistant helping a customer service agent respond to customer inquiries. Based on the conversation below, suggest 3 helpful, professional responses that the agent could use.

Conversation:
${conversationContext}

Please provide 3 different response suggestions that are:
1. Professional and helpful
2. Appropriate for customer service
3. Varied in tone (empathetic, solution-focused, informative)

Format your response as a JSON array of objects with "text", "reason", and "confidence" fields.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a helpful customer service AI assistant. Respond only with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the AI response
    let suggestions;
    try {
      suggestions = JSON.parse(responseText);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      suggestions = [
        {
          text: "Thank you for reaching out. I understand your concern and I'm here to help you resolve this issue.",
          reason: "Empathetic acknowledgment",
          confidence: 0.8
        },
        {
          text: "Let me look into this for you right away. Can you provide me with a few more details about what you're experiencing?",
          reason: "Solution-focused approach",
          confidence: 0.9
        },
        {
          text: "I appreciate your patience. Based on what you've described, here are a few options we can explore to address your concern.",
          reason: "Informative and structured",
          confidence: 0.85
        }
      ];
    }

    // Ensure suggestions have the required format
    const formattedSuggestions = suggestions.map((suggestion: any, index: number) => ({
      text: suggestion.text || suggestion.response || '',
      reason: suggestion.reason || 'AI-generated suggestion',
      confidence: suggestion.confidence || 0.8,
      rank: index + 1
    }));

    console.log('[AI Suggestions]', {
      conversationId: body.conversationId,
      suggestionsCount: formattedSuggestions.length,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      ok: true,
      suggestions: formattedSuggestions,
      conversationId: body.conversationId
    });

  } catch (error) {
    console.error('[AI Suggestions Error]', error);
    
    // Return fallback suggestions if OpenAI fails
    const fallbackSuggestions = [
      {
        text: "Thank you for contacting us. I'm here to help you with your inquiry.",
        reason: "Standard greeting",
        confidence: 0.7,
        rank: 1
      },
      {
        text: "I understand your concern. Let me assist you in finding the best solution.",
        reason: "Empathetic response",
        confidence: 0.7,
        rank: 2
      },
      {
        text: "Could you please provide more details so I can better assist you?",
        reason: "Information gathering",
        confidence: 0.7,
        rank: 3
      }
    ];

    return NextResponse.json({
      ok: true,
      suggestions: fallbackSuggestions,
      conversationId: body.conversationId,
      fallback: true,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: '/api/ai-suggestions',
    methods: ['POST'],
    configured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
}

