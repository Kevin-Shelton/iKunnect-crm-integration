-- Migration: Add Translation and Sentiment Analysis Fields
-- Run this in Supabase SQL Editor

-- Add translation and sentiment fields to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS original_text TEXT,
ADD COLUMN IF NOT EXISTS translated_text TEXT,
ADD COLUMN IF NOT EXISTS source_lang TEXT,
ADD COLUMN IF NOT EXISTS target_lang TEXT,
ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
ADD COLUMN IF NOT EXISTS sentiment_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT FALSE;

-- Add language tracking to conversations table
ALTER TABLE conversations
ADD COLUMN IF NOT EXISTS customer_language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS agent_language TEXT DEFAULT 'en';

-- Add translation and sentiment fields to chat_events table (if it exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'chat_events') THEN
    ALTER TABLE chat_events 
    ADD COLUMN IF NOT EXISTS original_text TEXT,
    ADD COLUMN IF NOT EXISTS translated_text TEXT,
    ADD COLUMN IF NOT EXISTS source_lang TEXT,
    ADD COLUMN IF NOT EXISTS target_lang TEXT,
    ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
    ADD COLUMN IF NOT EXISTS sentiment_confidence DECIMAL(3,2),
    ADD COLUMN IF NOT EXISTS customer_language TEXT,
    ADD COLUMN IF NOT EXISTS agent_language TEXT;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON messages(sentiment) WHERE sentiment IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_source_lang ON messages(source_lang) WHERE source_lang IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_customer_language ON conversations(customer_language);

-- Add comment for documentation
COMMENT ON COLUMN messages.original_text IS 'Original message text before translation';
COMMENT ON COLUMN messages.translated_text IS 'Translated message text';
COMMENT ON COLUMN messages.source_lang IS 'ISO 639-1 language code of original message';
COMMENT ON COLUMN messages.target_lang IS 'ISO 639-1 language code of translated message';
COMMENT ON COLUMN messages.sentiment IS 'Sentiment analysis result: positive, negative, neutral, or mixed';
COMMENT ON COLUMN messages.sentiment_confidence IS 'Confidence score for sentiment analysis (0.00 to 1.00)';
COMMENT ON COLUMN messages.is_translated IS 'Whether this message was translated';
COMMENT ON COLUMN conversations.customer_language IS 'Customer preferred language (ISO 639-1 code)';
COMMENT ON COLUMN conversations.agent_language IS 'Agent preferred language (ISO 639-1 code)';
