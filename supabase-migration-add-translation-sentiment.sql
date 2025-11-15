-- Migration: Add Translation and Sentiment Analysis Fields
-- Run this in your Supabase SQL editor to add translation and sentiment support

-- Add translation and sentiment fields to messages table
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS original_text TEXT,
  ADD COLUMN IF NOT EXISTS translated_text TEXT,
  ADD COLUMN IF NOT EXISTS source_lang TEXT,
  ADD COLUMN IF NOT EXISTS target_lang TEXT,
  ADD COLUMN IF NOT EXISTS translation_status TEXT CHECK (translation_status IN ('none', 'pending', 'success', 'failed')),
  ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'mixed')),
  ADD COLUMN IF NOT EXISTS sentiment_confidence DECIMAL(3,2),
  ADD COLUMN IF NOT EXISTS is_translated BOOLEAN DEFAULT FALSE;

-- Add language preference to conversations table
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS customer_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS agent_language TEXT DEFAULT 'en';

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_messages_source_lang ON messages(source_lang);
CREATE INDEX IF NOT EXISTS idx_messages_sentiment ON messages(sentiment);
CREATE INDEX IF NOT EXISTS idx_conversations_customer_language ON conversations(customer_language);

-- Add comments for documentation
COMMENT ON COLUMN messages.original_text IS 'Original message text before translation';
COMMENT ON COLUMN messages.translated_text IS 'Translated message text';
COMMENT ON COLUMN messages.source_lang IS 'Source language code (ISO 639-1)';
COMMENT ON COLUMN messages.target_lang IS 'Target language code (ISO 639-1)';
COMMENT ON COLUMN messages.translation_status IS 'Status of translation: none, pending, success, failed';
COMMENT ON COLUMN messages.sentiment IS 'Sentiment analysis result: positive, negative, neutral, mixed';
COMMENT ON COLUMN messages.sentiment_confidence IS 'Confidence score for sentiment (0.00 to 1.00)';
COMMENT ON COLUMN messages.is_translated IS 'Whether this message has been translated';
COMMENT ON COLUMN conversations.customer_language IS 'Customer preferred language (ISO 639-1)';
COMMENT ON COLUMN conversations.agent_language IS 'Agent preferred language (ISO 639-1)';
