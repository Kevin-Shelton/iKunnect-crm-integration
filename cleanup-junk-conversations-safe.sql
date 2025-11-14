-- SAFE Cleanup script for junk "Visitor XXXX" conversations
-- This version ONLY deletes conversations with empty or meaningless messages
-- Preserves conversations with actual customer/AI agent content

-- Step 1: Identify TRULY JUNK conversations (empty or only system messages)
-- These have no meaningful text content
SELECT 
  conversation_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message,
  STRING_AGG(DISTINCT COALESCE(text, '(empty)'), ' | ') as all_messages
FROM chat_events
WHERE 
  conversation_id LIKE 'conv_%'
  AND (
    payload->>'contactId' LIKE 'contact_conv_%'
    OR payload->>'contactId' IS NULL
    OR payload->'contact'->>'id' LIKE 'contact_conv_%'
    OR payload->'contact'->>'id' IS NULL
  )
GROUP BY conversation_id
HAVING 
  -- Only conversations where ALL messages are empty or system messages
  BOOL_AND(
    text IS NULL 
    OR text = '' 
    OR text = 'Customer started a new chat.'
    OR text LIKE 'Visitor % joined the conversation'
  )
ORDER BY last_message DESC;

-- Step 2: Count TRULY JUNK conversations (safe to delete)
SELECT COUNT(*) as truly_junk_conversation_count
FROM (
  SELECT conversation_id
  FROM chat_events
  WHERE 
    conversation_id LIKE 'conv_%'
    AND (
      payload->>'contactId' LIKE 'contact_conv_%'
      OR payload->>'contactId' IS NULL
      OR payload->'contact'->>'id' LIKE 'contact_conv_%'
      OR payload->'contact'->>'id' IS NULL
    )
  GROUP BY conversation_id
  HAVING 
    BOOL_AND(
      text IS NULL 
      OR text = '' 
      OR text = 'Customer started a new chat.'
      OR text LIKE 'Visitor % joined the conversation'
    )
) as junk_convs;

-- Step 3: DELETE ONLY truly junk conversations (UNCOMMENT TO EXECUTE)
-- WARNING: This will permanently delete these records!
/*
DELETE FROM chat_events
WHERE conversation_id IN (
  SELECT conversation_id
  FROM chat_events
  WHERE 
    conversation_id LIKE 'conv_%'
    AND (
      payload->>'contactId' LIKE 'contact_conv_%'
      OR payload->>'contactId' IS NULL
      OR payload->'contact'->>'id' LIKE 'contact_conv_%'
      OR payload->'contact'->>'id' IS NULL
    )
  GROUP BY conversation_id
  HAVING 
    BOOL_AND(
      text IS NULL 
      OR text = '' 
      OR text = 'Customer started a new chat.'
      OR text LIKE 'Visitor % joined the conversation'
    )
);
*/

-- Step 4: Clean up conversation_status table for deleted conversations
/*
DELETE FROM conversation_status
WHERE 
  conversation_id LIKE 'conv_%'
  AND conversation_id NOT IN (
    SELECT DISTINCT conversation_id 
    FROM chat_events
  );
*/

-- Step 5: VERIFY - Show conversations that WILL BE PRESERVED (have real messages)
-- Run this to make sure we're not deleting anything important
SELECT 
  conversation_id,
  COUNT(*) as message_count,
  STRING_AGG(DISTINCT SUBSTRING(text, 1, 100), ' | ') as sample_messages
FROM chat_events
WHERE 
  conversation_id LIKE 'conv_%'
  AND (
    payload->>'contactId' LIKE 'contact_conv_%'
    OR payload->>'contactId' IS NULL
    OR payload->'contact'->>'id' LIKE 'contact_conv_%'
    OR payload->'contact'->>'id' IS NULL
  )
  AND text IS NOT NULL
  AND text != ''
  AND text != 'Customer started a new chat.'
  AND text NOT LIKE 'Visitor % joined the conversation'
GROUP BY conversation_id
ORDER BY MAX(created_at) DESC
LIMIT 50;
