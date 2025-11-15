/**
 * Verbum Translation API Route
 * 
 * Translates text using Verbum AI service
 * Endpoint: POST /api/verbum/translate
 */

import { NextRequest, NextResponse } from 'next/server';

const VERBUM_API_KEY = process.env.VERBUM_API_KEY;
const VERBUM_TRANSLATE_URL = 'https://verbum.ai/api/v1/translate';

export async function POST(request: NextRequest) {
  try {
    const { text, source_lang, target_lang } = await request.json();

    // Validation
    if (!text || !source_lang || !target_lang) {
      return NextResponse.json(
        { error: 'Missing required fields: text, source_lang, target_lang' },
        { status: 400 }
      );
    }

    if (!VERBUM_API_KEY) {
      console.error('[Verbum] API key not configured');
      return NextResponse.json(
        { error: 'Translation service not configured', original: text },
        { status: 500 }
      );
    }

    // Convert locale formats to 2-letter codes if needed
    const sourceCode = source_lang.split('-')[0].toLowerCase();
    const targetCode = target_lang.split('-')[0].toLowerCase();

    console.log('[Verbum] Translating:', {
      text: text.substring(0, 50) + '...',
      from: sourceCode,
      to: targetCode
    });

    // Call Verbum API
    const response = await fetch(VERBUM_TRANSLATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': VERBUM_API_KEY,
      },
      body: JSON.stringify({
        text,
        source_lang: sourceCode,
        target_lang: targetCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Verbum] Translation failed:', response.status, errorText);
      
      // Return original text on error (don't block communication)
      return NextResponse.json(
        {
          translation: text,
          original: text,
          error: `Translation service error: ${response.status}`,
          fallback: true
        },
        { status: 200 } // Return 200 so client can handle gracefully
      );
    }

    const data = await response.json();
    
    console.log('[Verbum] Translation successful');

    return NextResponse.json({
      translation: data.translation || text,
      original: text,
      source_lang: sourceCode,
      target_lang: targetCode,
      fallback: false
    });

  } catch (error) {
    console.error('[Verbum] Translation error:', error);
    
    // Return original text on error
    const { text } = await request.json().catch(() => ({ text: '' }));
    return NextResponse.json(
      {
        translation: text,
        original: text,
        error: 'Translation failed',
        fallback: true
      },
      { status: 200 }
    );
  }
}
