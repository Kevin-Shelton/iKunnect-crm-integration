-- Create conversation_status table for tracking conversation states
CREATE TABLE IF NOT EXISTS conversation_status (
  id SERIAL PRIMARY KEY,
  conversation_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'rejected', 'passed')),
  agent_id TEXT,
  claimed_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejection_reason TEXT,
  passed_at TIMESTAMPTZ,
  passed_by TEXT,
  restored_at TIMESTAMPTZ,
  restored_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_status_conversation_id ON conversation_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_status_status ON conversation_status(status);
CREATE INDEX IF NOT EXISTS idx_conversation_status_agent_id ON conversation_status(agent_id);

-- Create function to create table if not exists (for runtime use)
CREATE OR REPLACE FUNCTION create_conversation_status_table_if_not_exists()
RETURNS VOID AS $$
BEGIN
  -- This function is called from the application to ensure table exists
  -- The actual table creation is handled by the CREATE TABLE IF NOT EXISTS above
  NULL;
END;
$$ LANGUAGE plpgsql;
