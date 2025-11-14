-- GHL OAuth Tokens Table
-- This table stores OAuth tokens for GoHighLevel API 2.0 integration
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS ghl_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL UNIQUE,
  company_id TEXT,
  user_id TEXT,
  user_type TEXT CHECK (user_type IN ('Location', 'Company')),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMPTZ NOT NULL,
  scope TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for fast lookups by location_id
CREATE INDEX IF NOT EXISTS idx_ghl_tokens_location_id ON ghl_oauth_tokens(location_id);

-- Create index for token expiry (for cleanup jobs)
CREATE INDEX IF NOT EXISTS idx_ghl_tokens_expiry ON ghl_oauth_tokens(token_expiry);

-- Enable Row Level Security (RLS)
ALTER TABLE ghl_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage GHL tokens" ON ghl_oauth_tokens
  FOR ALL USING (auth.role() = 'service_role');

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_ghl_oauth_tokens_updated_at 
  BEFORE UPDATE ON ghl_oauth_tokens 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Note: The update_updated_at_column() function should already exist from the main schema
-- If not, run the main supabase-schema.sql first
