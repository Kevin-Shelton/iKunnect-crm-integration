/**
 * Translation Helper Utilities
 * 
 * Handles message translation and sentiment analysis using Verbum AI
 */

export interface TranslationResult {
  translation: string;
  original: string;
  source_lang: string;
  target_lang: string;
  fallback: boolean;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
  confidenceScores?: {
    positive?: number;
    negative?: number;
    neutral?: number;
    mixed?: number;
  };
  fallback?: boolean;
}

/**
 * Translate text from source language to target language
 */
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  try {
    const response = await fetch('/api/verbum/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        source_lang: sourceLang,
        target_lang: targetLang,
      }),
    });

    if (!response.ok) {
      console.error('[Translation] API error:', response.status);
      return {
        translation: text,
        original: text,
        source_lang: sourceLang,
        target_lang: targetLang,
        fallback: true,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[Translation] Error:', error);
    return {
      translation: text,
      original: text,
      source_lang: sourceLang,
      target_lang: targetLang,
      fallback: true,
    };
  }
}

/**
 * Analyze sentiment of text
 */
export async function analyzeSentiment(
  text: string,
  language: string = 'en'
): Promise<SentimentResult> {
  try {
    const response = await fetch('/api/verbum/sentiment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language,
      }),
    });

    if (!response.ok) {
      console.error('[Sentiment] API error:', response.status);
      return {
        sentiment: 'neutral',
        confidence: 0,
        fallback: true,
      };
    }

    return await response.json();
  } catch (error) {
    console.error('[Sentiment] Error:', error);
    return {
      sentiment: 'neutral',
      confidence: 0,
      fallback: true,
    };
  }
}

/**
 * Get sentiment emoji and color
 */
export function getSentimentDisplay(sentiment: string): {
  emoji: string;
  color: string;
  label: string;
} {
  switch (sentiment) {
    case 'positive':
      return {
        emoji: '😊',
        color: 'bg-green-100 text-green-800 border-green-300',
        label: 'Positive',
      };
    case 'negative':
      return {
        emoji: '😟',
        color: 'bg-red-100 text-red-800 border-red-300',
        label: 'Negative',
      };
    case 'mixed':
      return {
        emoji: '😕',
        color: 'bg-orange-100 text-orange-800 border-orange-300',
        label: 'Mixed',
      };
    case 'neutral':
    default:
      return {
        emoji: '😐',
        color: 'bg-gray-100 text-gray-800 border-gray-300',
        label: 'Neutral',
      };
  }
}
