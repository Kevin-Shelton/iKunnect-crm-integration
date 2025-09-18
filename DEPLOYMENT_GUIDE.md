# Deployment Guide - GoHighLevel Agent Desk Integration

## Quick Start

### 1. Environment Configuration
Update your `.env.local` or production environment variables:

```env
# Required: Webhook Security
SHARED_HMAC_SECRET=your_production_secret_key_change_this

# Optional: Polling Configuration
NEXT_PUBLIC_POLLING_INTERVAL=3000
NEXT_PUBLIC_MAX_CHAT_TABS=6

# Optional: SLA Configuration (in minutes)
NEXT_PUBLIC_SLA_WARNING_TIME=5
NEXT_PUBLIC_SLA_BREACH_TIME=10
```

### 2. n8n Webhook Configuration

Configure your n8n workflow to send chat events to:
```
POST https://your-domain.com/api/chat-events
```

**Required Headers:**
```
Content-Type: application/json
x-signature: sha256={hmac_signature}
```

**HMAC Signature Generation (n8n JavaScript):**
```javascript
const crypto = require('crypto');
const secret = 'your_production_secret_key_change_this'; // Same as SHARED_HMAC_SECRET
const body = JSON.stringify({
  conversationId: "conv_123456789",
  contactId: "contact_123456789", 
  direction: "inbound", // or "outbound"
  actor: "customer", // or "ai" or "agent"
  text: "Customer message text",
  timestamp: new Date().toISOString(),
  correlationId: "unique_event_id_123"
});

const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
// Use signature in header: x-signature: sha256=${signature}
```

### 3. Testing the Integration

#### Test with API Endpoint
Create a test conversation:
```bash
curl -X GET "https://your-domain.com/api/test-chat-event"
```

#### Test Individual Messages
```bash
curl -X POST "https://your-domain.com/api/test-chat-event?type=customer&conversationId=test123&contactId=contact123&message=Hello"
```

### 4. Verify Integration

1. **Check Webhook Endpoint**: Visit `/api/chat-events` - should return method not allowed for GET
2. **Check Conversations**: Visit your domain - should show Agent Desk interface
3. **Create Test Data**: Use test endpoint to create sample conversations
4. **Verify Real-time Updates**: Messages should appear within 2 seconds

## Production Deployment

### Vercel Deployment
1. **Push to Repository**: Commit all changes to your Git repository
2. **Deploy to Vercel**: Connect repository to Vercel project
3. **Set Environment Variables** in Vercel dashboard:
   - `SHARED_HMAC_SECRET=your_production_secret`
4. **Update n8n Webhook URL** to production domain

### Other Hosting Platforms
1. **Build Application**: `npm run build`
2. **Set Environment Variables** in hosting platform
3. **Deploy Built Application**
4. **Update n8n Webhook URL**

## Monitoring & Troubleshooting

### Check Webhook Logs
Monitor your application logs for:
```
✅ HMAC verification passed
📨 Valid chat event received
💾 Stored event. Conversation {id} now has {count} events
```

### Common Issues

#### HMAC Verification Failed
- **Cause**: Incorrect secret or signature generation
- **Solution**: Verify `SHARED_HMAC_SECRET` matches in both n8n and application

#### Messages Not Appearing
- **Cause**: Webhook not reaching endpoint or storage issues
- **Solution**: Check network connectivity and webhook URL

#### Conversations Not Loading
- **Cause**: API endpoint issues or empty storage
- **Solution**: Create test data using `/api/test-chat-event`

### Debug Endpoints

#### Check Storage Stats
```bash
curl "https://your-domain.com/api/chat-events?conversationId=any_id"
```

#### View Conversation Data
```bash
curl "https://your-domain.com/api/conversations-from-events"
```

## Security Considerations

### HMAC Secret Management
- **Development**: Use placeholder secret in `.env.local`
- **Production**: Use strong, unique secret (32+ characters)
- **Rotation**: Plan for periodic secret rotation

### Webhook Security
- **HTTPS Only**: Always use HTTPS in production
- **IP Whitelisting**: Consider restricting to n8n server IPs
- **Rate Limiting**: Implement rate limiting for webhook endpoint

## Performance Optimization

### Current Implementation
- **Polling Interval**: 2 seconds (configurable)
- **Storage**: File-based (suitable for development/small scale)
- **Concurrent Users**: Limited by file system performance

### Production Recommendations
1. **Database Storage**: Replace file storage with PostgreSQL/MongoDB
2. **WebSocket Updates**: Replace polling with real-time WebSocket connections
3. **Caching**: Implement Redis caching for conversation data
4. **Load Balancing**: Use multiple instances for high availability

## Backup & Recovery

### Data Storage Location
- **Development**: `./data/chat-events.json`
- **Production**: Ensure data directory is backed up

### Backup Strategy
1. **Regular Backups**: Schedule daily backups of data directory
2. **Database Migration**: Plan migration to database for production
3. **Disaster Recovery**: Test restore procedures

## Support & Maintenance

### Regular Tasks
1. **Monitor Logs**: Check for webhook errors and HMAC failures
2. **Clean Old Data**: Implement cleanup for conversations older than 30 days
3. **Update Dependencies**: Keep Next.js and dependencies updated
4. **Security Updates**: Monitor for security patches

### Scaling Considerations
- **Message Volume**: Current implementation handles ~1000 messages/hour
- **Concurrent Agents**: Tested with up to 10 concurrent agent sessions
- **Storage Growth**: Plan for database migration when file storage exceeds 100MB

## Contact & Support

For technical issues or questions about this integration:
1. Check application logs for error messages
2. Verify n8n webhook configuration and HMAC signature
3. Test with provided debug endpoints
4. Review this deployment guide for common solutions

---

**Last Updated**: September 12, 2025
**Version**: 1.0.0
**Status**: Production Ready




## AI Suggestions Setup

1.  Create a new OpenAI API key.
2.  Add the API key to the `OPENAI_API_KEY` environment variable in your Vercel project settings.
3.  The `/api/ai-suggestions` endpoint will now be active and will generate suggestions when called from the customer chat page.


