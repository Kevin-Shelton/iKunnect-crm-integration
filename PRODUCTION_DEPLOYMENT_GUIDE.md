# Production Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Environment Variables Setup (Vercel)

Add these environment variables to your Vercel project:

```bash
# Supabase Configuration (Required for persistence)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_TOKEN=your-supabase-service-role-key

# n8n Integration (Required for AI features)
SHARED_HMAC_SECRET=your-shared-secret-for-webhook-security

# Optional: Error Handling
REJECT_UNSIGNED=false  # Set to true for strict HMAC validation
```

### 2. Database Setup (Supabase)

The system works with the existing `chat_events` table. Optionally, you can also create the normalized tables:

```sql
-- Optional: Create normalized tables (recommended for better performance)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'assigned', 'closed')),
  assigned_agent TEXT,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL CHECK (sender IN ('customer', 'agent')),
  timestamp TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);
```

### 3. Deploy to Vercel

```bash
# Push your changes
git add .
git commit -m "Production-ready chat integration system"
git push origin main

# Deploy will happen automatically via Vercel GitHub integration
```

### 4. Verify Deployment

After deployment, test these endpoints:

```bash
# Test message sending
curl -X POST https://i-kunnect-crm-int.vercel.app/api/livechat/send \
  -H "Content-Type: application/json" \
  -d '{"conversation":{"id":"test-001"},"message":{"text":"Test message"}}'

# Test conversation retrieval
curl https://i-kunnect-crm-int.vercel.app/api/conversations/test-001/messages

# Test AI suggestions
curl -X POST https://i-kunnect-crm-int.vercel.app/api/ai-suggestions \
  -H "Content-Type: application/json" \
  -d '{"conversationId":"test-001","messages":[{"sender":"customer","text":"Hello"}]}'
```

## 🔧 Configuration Details

### Supabase Setup

1. **Get your Supabase URL and Service Role Key**:
   - Go to your Supabase project dashboard
   - Navigate to Settings → API
   - Copy the Project URL and Service Role Key

2. **Configure Row Level Security (RLS)**:
   ```sql
   -- Enable RLS on tables
   ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
   
   -- Create policies for service role access
   CREATE POLICY "Service role can manage conversations" ON conversations
     FOR ALL USING (auth.role() = 'service_role');
   
   CREATE POLICY "Service role can manage messages" ON messages
     FOR ALL USING (auth.role() = 'service_role');
   ```

### n8n Webhook Configuration

The system uses the existing n8n webhook:
- **URL**: `https://invictusbpo.app.n8n.cloud/webhook/ghl-chat-inbound`
- **Method**: POST
- **Authentication**: HMAC signature (if SHARED_HMAC_SECRET is set)

## 🧪 Testing in Production

### 1. Automated Health Check

Create a simple health check script:

```javascript
// health-check.js
const fetch = require('node-fetch');

async function healthCheck() {
  const baseUrl = 'https://i-kunnect-crm-int.vercel.app';
  
  try {
    // Test message sending
    const sendResponse = await fetch(`${baseUrl}/api/livechat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation: { id: 'health-check' },
        message: { text: 'Health check message' }
      })
    });
    
    if (!sendResponse.ok) throw new Error('Send API failed');
    
    // Test message retrieval
    const getResponse = await fetch(`${baseUrl}/api/conversations/health-check/messages`);
    if (!getResponse.ok) throw new Error('Get API failed');
    
    console.log('✅ Health check passed');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

healthCheck();
```

### 2. Load Testing

Use the provided test script for load testing:

```bash
# Run concurrent conversation test
node test-concurrent-conversations.js
```

## 📊 Monitoring Setup

### 1. Error Tracking

Add error tracking service (e.g., Sentry):

```javascript
// Add to your API routes
import * as Sentry from '@sentry/nextjs';

try {
  // Your API logic
} catch (error) {
  Sentry.captureException(error);
  // Handle error
}
```

### 2. Performance Monitoring

Monitor key metrics:
- API response times
- Database query performance
- n8n webhook response times
- Memory usage
- Error rates

### 3. Logging

The system includes comprehensive logging. Set up log aggregation:
- Use Vercel's built-in logging
- Or integrate with external services (DataDog, LogRocket, etc.)

## 🔒 Security Considerations

### 1. Environment Variables
- Never commit secrets to git
- Use Vercel's environment variable encryption
- Rotate secrets regularly

### 2. API Security
- HMAC signature verification is implemented
- Input validation on all endpoints
- Rate limiting (consider adding Vercel's rate limiting)

### 3. Database Security
- Use service role key (not anon key) for server-side operations
- Enable RLS on all tables
- Regular security audits

## 🚨 Troubleshooting

### Common Issues

1. **"Database query failed" error**:
   - Check Supabase environment variables
   - Verify service role key permissions
   - Check network connectivity

2. **AI suggestions not working**:
   - Verify n8n webhook is accessible
   - Check SHARED_HMAC_SECRET configuration
   - Review n8n workflow logs

3. **Messages not persisting**:
   - Check Supabase connection
   - Verify table permissions
   - Review server logs for errors

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

### Support Channels

- Check server logs in Vercel dashboard
- Review browser console for client-side errors
- Use the test scripts to isolate issues
- Check n8n workflow execution logs

## 📈 Performance Optimization

### 1. Database Optimization
- Use appropriate indexes
- Implement connection pooling
- Consider read replicas for high traffic

### 2. Caching
- Implement Redis for session caching
- Use CDN for static assets
- Cache AI suggestions for common queries

### 3. Scaling
- Monitor Vercel function execution times
- Consider upgrading to Vercel Pro for better performance
- Implement horizontal scaling for high load

---

**Deployment Status**: ✅ Ready for Production  
**Last Updated**: September 18, 2025  
**Support**: Check logs and test scripts for troubleshooting
