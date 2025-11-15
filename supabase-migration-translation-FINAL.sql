-- Migration: Add Translation and Sentiment Analysis Fields to chat_events
-- Run this in Supabase SQL Editor

-- Add translation and sentiment fields to chat_events table
ALTER TABLE chat_events 
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS source_lang TEXT,
ADD COLUMN IF NOT EXISTS target_lang TEXT,
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
ADD COLUMN IF NOT EXISTS sentiment_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS customer_language TEXT,
ADD COLUMN IF NOT EXISTS agent_language TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_events_sentiment ON chat_events(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_events_source_lang ON chat_events(source_lang) WHERE source_lang IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_events_customer_language ON chat_events(customer_language) WHERE customer_language IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN chat_events.original_text IS 'Original message text before translation';
COMMENT ON COLUMN chat_events.translated_text IS 'Translated message text';
COMMENT ON COLUMN chat_events.source_lang IS 'ISO 639-1 language code of original message';
COMMENT ON COLUMN chat_events.target_lang IS 'ISO 639-1 language code of translated message';
COMMENT ON COLUMN chat_events.sentiment IS 'Sentiment analysis result: positive, negative, neutral, or mixed';
COMMENT ON COLUMN chat_events.sentiment_confidence IS 'Confidence score for sentiment analysis (0.00 to 1.00)';
COMMENT ON COLUMN chat_events.customer_language IS 'Customer preferred language (ISO 639-1 code)';
COMMENT ON COLUMN chat_events.agent_language IS 'Agent preferred language (ISO 639-1 code)';
