-- Supabase Database Schema for Chat Integration System
-- Run this in your Supabase SQL editor to create the required tables

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'closed')),
  assigned_agent TEXT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'agent')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);

-- Enable Row Level Security (RLS)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (adjust as needed for your security requirements)
CREATE POLICY "Service role can manage conversations" ON conversations
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage messages" ON messages
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at on conversations
CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON conversations 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
-- INSERT INTO conversations (id, customer_name, status) VALUES 
--   ('sample-conv-1', 'Sample Customer 1', 'waiting'),
--   ('sample-conv-2', 'Sample Customer 2', 'assigned');

-- INSERT INTO messages (id, conversation_id, text, sender, timestamp) VALUES
--   ('msg-1', 'sample-conv-1', 'Hello, I need help with my order', 'customer', NOW()),
--   ('msg-2', 'sample-conv-1', 'Sure, I can help you with that', 'agent', NOW() + INTERVAL '1 minute'),
--   ('msg-3', 'sample-conv-2', 'My account is locked', 'customer', NOW() + INTERVAL '2 minutes');

