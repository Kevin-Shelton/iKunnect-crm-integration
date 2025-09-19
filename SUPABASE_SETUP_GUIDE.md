# Supabase Setup Guide for iKunnect CRM Integration

## Overview

This guide explains how to set up Supabase database for the iKunnect CRM chat integration system. The application currently shows "Database Configuration Required" because Supabase credentials are not configured in the production environment.

## Current Issue

The agent interface displays timestamps instead of actual message content because:
1. Supabase environment variables are not configured in production
2. The debug endpoint shows: `"hasSupabaseUrl":false,"hasServiceKey":false`
3. Without database access, no chat events can be stored or retrieved

## Required Environment Variables

The following environment variables must be configured in your Vercel deployment:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_TOKEN=your-anon-key
SUPABASE_SERVICE_ROLE_TOKEN=your-service-role-key

# HMAC Secret for webhook verification
SHARED_HMAC_SECRET=your-hmac-secret

# n8n Integration for AI suggestions
N8N_AI_SUGGESTIONS_WEBHOOK_URL=your-n8n-webhook-url

# Other configuration
REJECT_UNSIGNED=false
```

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

## Step 2: Set Up Database Schema

Run the following SQL in your Supabase SQL editor:

```sql
-- Create chat_events table
CREATE TABLE IF NOT EXISTS chat_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('inbound', 'agent_send', 'suggestions', 'admin')),
  message_id TEXT,
  text TEXT,
  items JSONB,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_events_conversation_id ON chat_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_events_created_at ON chat_events(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_events_type ON chat_events(type);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE chat_events ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (adjust as needed for your security requirements)
CREATE POLICY "Allow all operations on chat_events" ON chat_events
  FOR ALL USING (true);
```

## Step 3: Configure Vercel Environment Variables

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add the following variables:

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://your-project.supabase.co` | Production |
| `NEXT_PUBLIC_SUPABASE_ANON_TOKEN` | Your anon key from Supabase | Production |
| `SUPABASE_SERVICE_ROLE_TOKEN` | Your service role key from Supabase | Production |
| `SHARED_HMAC_SECRET` | Your webhook secret | Production |
| `N8N_AI_SUGGESTIONS_WEBHOOK_URL` | Your n8n webhook URL | Production |
| `REJECT_UNSIGNED` | `false` | Production |

## Step 4: Redeploy Application

After configuring the environment variables:
1. Trigger a new deployment in Vercel
2. Wait for deployment to complete
3. Test the debug endpoint: `https://i-kunnect-crm-int.vercel.app/api/debug/chat-events`

## Step 5: Verify Configuration

1. **Check Debug Endpoint**: Visit `/api/debug/chat-events` - it should show:
   ```json
   {
     "success": true,
     "timestamp": "2025-09-19T...",
     "eventCount": 0,
     "recentEvents": []
   }
   ```

2. **Test Webhook**: Send a test webhook to `/api/chat-events`:
   ```bash
   curl -X POST https://i-kunnect-crm-int.vercel.app/api/chat-events \
     -H "Content-Type: application/json" \
     -d '{
       "type": "inbound",
       "text": "Test message",
       "messageId": "test_123",
       "conversation": {"id": "conv_test"},
       "contact": {"id": "contact_test"}
     }'
   ```

3. **Check Agent Interface**: The interface should now show actual message content instead of timestamps.

## Troubleshooting

### Issue: Still showing "Database Configuration Required"
- **Solution**: Verify all environment variables are set correctly in Vercel
- **Check**: Visit the debug endpoint to confirm configuration

### Issue: "fetch failed" errors
- **Solution**: Check Supabase project is active and URLs are correct
- **Check**: Verify service role token has proper permissions

### Issue: Messages not appearing
- **Solution**: Check webhook is sending data to `/api/chat-events`
- **Check**: Look at Vercel function logs for errors

## Testing the Fix

Once configured, you can test the system:

1. **Send Test Webhook**: Use the curl command above
2. **Check Debug Endpoint**: Should show the test event
3. **View Agent Interface**: Should display the test message
4. **Verify n8n Integration**: Send real data from your n8n workflow

## Message Content Processing

The system correctly processes message content from multiple fields:
- `text` field (primary)
- `messageText` field (alternative)
- `body` field (fallback)

The processing logic has been tested and verified to work correctly. Once Supabase is configured, messages will display properly in the agent interface.

## Support

If you continue to experience issues after following this guide:
1. Check the debug endpoint for specific error messages
2. Review Vercel function logs
3. Verify your n8n webhook is sending the expected data format
