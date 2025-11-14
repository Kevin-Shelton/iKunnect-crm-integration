-- Check all messages with their type and sender
SELECT 
  id,
  conversation_id,
  type,
  text,
  payload->>'sender' as sender,
  payload->>'direction' as direction,
  created_at
FROM chat_events
ORDER BY created_at DESC
LIMIT 20;
