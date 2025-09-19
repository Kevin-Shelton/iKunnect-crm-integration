import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseService) {
      return NextResponse.json({
        error: 'Supabase not configured',
        analysis: null
      });
    }

    // Get recent chat events with full payloads
    const { data: events, error } = await supabaseService
      .from('chat_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({
        error: `Database error: ${error.message}`,
        analysis: null
      });
    }

    if (!events || events.length === 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          totalEvents: 0,
          message: 'No chat events found in database'
        }
      });
    }

    // Analyze the webhook payloads
    const analysis = {
      totalEvents: events.length,
      textFieldAnalysis: {
        emptyTextCount: 0,
        nonEmptyTextCount: 0,
        textFieldsFound: new Set<string>(),
        samplePayloads: [] as any[]
      },
      payloadStructures: new Map<string, number>(),
      eventTypes: new Map<string, number>()
    };

    events.forEach((event, index) => {
      // Analyze text content
      if (!event.text || event.text.trim() === '') {
        analysis.textFieldAnalysis.emptyTextCount++;
      } else {
        analysis.textFieldAnalysis.nonEmptyTextCount++;
      }

      // Analyze payload structure
      if (event.payload && typeof event.payload === 'object') {
        const payload = event.payload as Record<string, any>;
        
        // Check for various text fields
        const textFields = ['text', 'messageText', 'body', 'message', 'content'];
        textFields.forEach(field => {
          if (field in payload) {
            analysis.textFieldAnalysis.textFieldsFound.add(field);
          }
        });

        // Get payload structure signature
        const keys = Object.keys(payload).sort();
        const signature = keys.join(',');
        analysis.payloadStructures.set(signature, (analysis.payloadStructures.get(signature) || 0) + 1);

        // Count event types
        const eventType = event.type || 'unknown';
        analysis.eventTypes.set(eventType, (analysis.eventTypes.get(eventType) || 0) + 1);

        // Store sample payloads (first 3)
        if (index < 3) {
          analysis.textFieldAnalysis.samplePayloads.push({
            eventId: event.id,
            conversationId: event.conversation_id,
            storedText: event.text || '(empty)',
            payloadTextFields: {
              text: payload.text || '(not found)',
              messageText: payload.messageText || '(not found)',
              body: payload.body || '(not found)',
              message: payload.message || '(not found)',
              content: payload.content || '(not found)'
            },
            fullPayload: payload
          });
        }
      }
    });

    // Convert Maps to Objects for JSON serialization
    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      analysis: {
        ...analysis,
        textFieldAnalysis: {
          ...analysis.textFieldAnalysis,
          textFieldsFound: Array.from(analysis.textFieldAnalysis.textFieldsFound)
        },
        payloadStructures: Object.fromEntries(analysis.payloadStructures),
        eventTypes: Object.fromEntries(analysis.eventTypes)
      },
      recommendations: [] as any[]
    };

    // Add recommendations based on analysis
    if (analysis.textFieldAnalysis.emptyTextCount > 0) {
      result.recommendations.push({
        issue: 'Empty text fields detected',
        description: `${analysis.textFieldAnalysis.emptyTextCount} out of ${analysis.totalEvents} events have empty text fields`,
        suggestion: 'Check the n8n webhook configuration to ensure message content is being sent in the payload'
      });
    }

    if (analysis.textFieldAnalysis.textFieldsFound.length === 0) {
      result.recommendations.push({
        issue: 'No text fields found in payloads',
        description: 'None of the expected text fields (text, messageText, body, message, content) were found in webhook payloads',
        suggestion: 'Review the webhook payload structure and update the chat-events API to extract text from the correct field'
      });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('[Webhook Analysis] Error:', error);
    return NextResponse.json({
      error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      analysis: null
    }, { status: 500 });
  }
}
