# Production Setup Guide

## Overview

The chat integration system now supports **dual storage**:
- **Supabase** for production persistent storage
- **In-memory fallback** for development/testing

## Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and API keys

### 2. Set Up Database Schema
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Run the SQL from `supabase-schema.sql` file
4. This creates the required `conversations` and `messages` tables

### 3. Configure Environment Variables

#### For Vercel Deployment:
Add these environment variables in your Vercel dashboard:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_TOKEN=your-anon-key-here
SUPABASE_SERVICE_ROLE_TOKEN=your-service-role-key-here

# OpenAI Configuration (for AI suggestions)
OPENAI_API_KEY=your-openai-api-key-here

# HMAC Secret (for webhook verification)
SHARED_HMAC_SECRET=your-hmac-secret-here

# Security
REJECT_UNSIGNED=false
```

#### For Local Development:
Update your `.env.local` file with real values:

```bash
# Replace placeholder values with real Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Storage Behavior

### With Supabase Configured:
- ✅ **Persistent storage** - Data survives server restarts
- ✅ **Multi-instance support** - Works with multiple server instances
- ✅ **Production ready** - Suitable for live deployment
- ✅ **Backup/recovery** - Supabase handles backups
- ✅ **Dual storage** - Writes to both Supabase and memory for performance

### Without Supabase (Fallback):
- ⚠️ **In-memory only** - Data lost on server restart
- ⚠️ **Single instance** - Won't work with load balancing
- ✅ **Development friendly** - No setup required for testing
- ✅ **Fast performance** - No database latency

## Deployment Steps

### 1. Deploy to Vercel
```bash
git push origin main
```

### 2. Configure Environment Variables
- Add all required environment variables in Vercel dashboard
- Redeploy after adding variables

### 3. Test the System
1. **Check storage type**: Visit `/api/chat/debug` to see storage info
2. **Send test message**: Use customer chat to send a message
3. **Verify persistence**: Restart the application and check if data persists
4. **Test Agent Desk**: Ensure conversations appear and can be claimed

## Monitoring

### Check Storage Status
Visit `/api/chat/debug` to see:
- Storage type (supabase+memory or memory-only)
- Supabase configuration status
- Current conversation count

### Logs
Monitor Vercel function logs for:
- `[Storage] Using Supabase for persistent storage` - Good!
- `[Storage] Supabase not configured, using in-memory storage` - Need to add env vars
- `[Storage] Supabase storage failed, using memory fallback` - Check credentials

## Troubleshooting

### "Supabase not configured" Message
- Check environment variables are set correctly
- Ensure values are not placeholder text
- Redeploy after adding environment variables

### "Supabase storage failed" Errors
- Verify Supabase project is active
- Check service role token has correct permissions
- Ensure database schema is created
- Check Supabase project URL is correct

### Data Not Persisting
- Confirm Supabase environment variables are set
- Check `/api/chat/debug` shows "supabase+memory" storage type
- Verify database tables exist in Supabase dashboard

## Security Notes

- **Service Role Token**: Keep this secret, it has full database access
- **Row Level Security**: Enabled by default, adjust policies as needed
- **HMAC Secret**: Use a strong, random secret for webhook verification
- **Environment Variables**: Never commit real credentials to git

## Performance

The dual storage approach provides:
- **Fast reads**: Data cached in memory
- **Reliable writes**: Persisted to Supabase
- **Graceful degradation**: Falls back to memory if Supabase fails
- **Scalability**: Ready for production load

