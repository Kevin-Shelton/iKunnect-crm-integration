/**
 * Verbum Sentiment Analysis API Route
 * 
 * Analyzes sentiment of text using Verbum AI service
 * Endpoint: POST /api/verbum/sentiment
 */

import { NextRequest, NextResponse } from 'next/server';

const VERBUM_API_KEY = process.env.VERBUM_API_KEY;
const VERBUM_SENTIMENT_URL = 'https://sdk.verbum.ai/v1/text-analysis/sentiment';

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  confidenceScores?: {
    positive?: number;
    negative?: number;
    neutral?: number;
    mixed?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const { text, language } = await request.json();

    // Validation
    if (!text) {
      return NextResponse.json(
        { error: 'Missing required field: text' },
        { status: 400 }
      );
    }

    if (!VERBUM_API_KEY) {
      console.error('[Verbum Sentiment] API key not configured');
      return NextResponse.json(
        { 
          sentiment: 'neutral',
          confidence: 0,
          error: 'Sentiment service not configured'
        },
        { status: 200 } // Return neutral on error
      );
    }

    // Convert locale format to 2-letter code if needed
    const langCode = language ? language.split('-')[0].toLowerCase() : 'en';

    console.log('[Verbum Sentiment] Analyzing:', {
      text: text.substring(0, 50) + '...',
      language: langCode
    });

    // Call Verbum Sentiment API
    const response = await fetch(VERBUM_SENTIMENT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VERBUM_API_KEY,
      },
      body: JSON.stringify({
        texts: [text],
        language: langCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Verbum Sentiment] Analysis failed:', response.status, errorText);
      
      // Return neutral sentiment on error
      return NextResponse.json({
        sentiment: 'neutral',
        confidence: 0,
        error: `Sentiment service error: ${response.status}`,
        fallback: true
      });
    }

    const data = await response.json();
    
    // Extract first result (we only sent one text)
    const result = data[0] || {};
    
    // Determine primary sentiment from confidence scores
    const scores = result.confidenceScores || {};
    let sentiment: 'positive' | 'negative' | 'neutral' | 'mixed' = result.sentiment || 'neutral';
    
    // Calculate overall confidence
    const confidence = Math.max(
      scores.positive || 0,
      scores.negative || 0,
      scores.neutral || 0,
      scores.mixed || 0
    );

    console.log('[Verbum Sentiment] Analysis complete:', {
      sentiment,
      confidence: Math.round(confidence * 100) + '%'
    });

    return NextResponse.json({
      sentiment,
      confidence,
      confidenceScores: scores,
      fallback: false
    });

  } catch (error) {
    console.error('[Verbum Sentiment] Error:', error);
    
    // Return neutral sentiment on error
    return NextResponse.json({
      sentiment: 'neutral' as const,
      confidence: 0,
      error: 'Sentiment analysis failed',
      fallback: true
    });
  }
}
