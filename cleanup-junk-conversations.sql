-- Cleanup script for junk "Visitor XXXX" conversations
-- These are conversations created without proper contact information

-- Step 1: Identify junk conversations (for review before deletion)
-- These have conversation_id starting with 'conv_' and no real contact info
SELECT 
  conversation_id,
  COUNT(*) as message_count,
  MIN(created_at) as first_message,
  MAX(created_at) as last_message,
  STRING_AGG(DISTINCT text, ' | ') as sample_messages
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
ORDER BY last_message DESC;

-- Step 2: Count how many junk records will be deleted
SELECT COUNT(DISTINCT conversation_id) as junk_conversation_count
FROM chat_events
WHERE 
  conversation_id LIKE 'conv_%'
  AND (
    payload->>'contactId' LIKE 'contact_conv_%'
    OR payload->>'contactId' IS NULL
    OR payload->'contact'->>'id' LIKE 'contact_conv_%'
    OR payload->'contact'->>'id' IS NULL
  );

-- Step 3: DELETE junk conversations (UNCOMMENT TO EXECUTE)
-- WARNING: This will permanently delete these records!
/*
DELETE FROM chat_events
WHERE 
  conversation_id LIKE 'conv_%'
  AND (
    payload->>'contactId' LIKE 'contact_conv_%'
    OR payload->>'contactId' IS NULL
    OR payload->'contact'->>'id' LIKE 'contact_conv_%'
    OR payload->'contact'->>'id' IS NULL
  );
*/

-- Step 4: Also clean up conversation_status table
/*
DELETE FROM conversation_status
WHERE 
  conversation_id LIKE 'conv_%'
  AND conversation_id NOT IN (
    SELECT DISTINCT conversation_id 
    FROM chat_events 
    WHERE conversation_id NOT LIKE 'conv_%'
  );
*/
