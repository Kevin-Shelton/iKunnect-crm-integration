-- Migration: Add ai_agent_send and human_agent_send to chat_events type constraint
-- This allows the new message types to be stored in the database

-- Step 1: Drop the existing check constraint
ALTER TABLE chat_events DROP CONSTRAINT IF EXISTS chat_events_type_check;

-- Step 2: Add the updated check constraint with new types
ALTER TABLE chat_events ADD CONSTRAINT chat_events_type_check 
  CHECK (type IN ('inbound', 'agent_send', 'ai_agent_send', 'human_agent_send', 'suggestions', 'admin'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'chat_events_type_check';
