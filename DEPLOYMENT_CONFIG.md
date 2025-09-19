# Deployment Configuration

## Production URLs

### Primary Application
- **Main Application**: https://i-kunnect-crm-int.vercel.app/
- **Agent Chat Desk**: https://i-kunnect-crm-int.vercel.app/

### Debug & Maintenance Tools
- **Environment Debug**: https://i-kunnect-crm-int.vercel.app/debug-env
- **Chat Events Debug**: https://i-kunnect-crm-int.vercel.app/api/debug/chat-events
- **Environment Variables API**: https://i-kunnect-crm-int.vercel.app/api/debug/env-vars
- **Maintenance Page**: https://i-kunnect-crm-int.vercel.app/maintenance

### API Endpoints
- **Chat Events**: https://i-kunnect-crm-int.vercel.app/api/chat-events
- **Conversations**: https://i-kunnect-crm-int.vercel.app/api/conversations
- **Health Check**: https://i-kunnect-crm-int.vercel.app/api/desk/health
- **Setup Config**: https://i-kunnect-crm-int.vercel.app/api/setup-config

### Customer Interface
- **Customer Chat**: https://i-kunnect-crm-int.vercel.app/customer/chat

## Deployment Information
- **Vercel Project**: i-kunnect-crm-int
- **GitHub Repository**: https://github.com/Kevin-Shelton/iKunnect-crm-integration
- **Branch**: main
- **Environment**: Production

## Quick Links for Testing
```bash
# Health Check
curl https://i-kunnect-crm-int.vercel.app/api/desk/health

# Debug Chat Events
curl https://i-kunnect-crm-int.vercel.app/api/debug/chat-events

# Environment Variables
curl https://i-kunnect-crm-int.vercel.app/api/debug/env-vars

# Test Chat Event (POST)
curl -X POST https://i-kunnect-crm-int.vercel.app/api/chat-events \
  -H "Content-Type: application/json" \
  -d '{"test": "message"}'
```

## Navigation
- **Main App**: [Agent Chat Desk](https://i-kunnect-crm-int.vercel.app/)
- **Debug Tools**: [Environment Debug](https://i-kunnect-crm-int.vercel.app/debug-env)
- **Maintenance**: [Configuration Setup](https://i-kunnect-crm-int.vercel.app/maintenance)
