# n8n to Agent Desk Integration Guide

## Overview
This guide explains how to set up the complete integration between GoHighLevel, n8n workflows, and the Agent Desk to mirror customer conversations in real-time.

## Architecture Flow
```
GoHighLevel → n8n Workflow → AI Agent (MCP) → Agent Desk
```

1. **GoHighLevel** sends webhook notifications when customers send messages
2. **n8n** receives the webhook and processes the message
3. **AI Agent (MCP)** generates appropriate responses
4. **Agent Desk** receives mirrored conversations via secure API

---

## Step 1: Agent Desk API Endpoints

### Available Endpoints

#### 1. Chat Events Endpoint (Main Integration Point)
- **URL:** `https://i-kunnect-crm-int.vercel.app/api/chat-events`
- **Method:** `POST`
- **Purpose:** Receives mirrored messages from n8n workflows
- **Security:** HMAC SHA-256 signature verification

#### 2. Conversations Endpoint (Read-Only)
- **URL:** `https://i-kunnect-crm-int.vercel.app/api/conversations`
- **Method:** `GET`
- **Purpose:** Retrieves all conversations for the Agent Desk UI

---

## Step 2: HMAC Security Setup

### Generate HMAC Signature (Required)
All requests to `/api/chat-events` must include a valid HMAC signature.

**Current Secret:** `your_shared_hmac_secret_here_change_this_in_production`

### HMAC Generation Example (Node.js)
```javascript
const crypto = require('crypto');

function generateHMAC(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Usage in n8n
const messageBody = JSON.stringify(payload);
const signature = generateHMAC(messageBody, 'your_shared_hmac_secret_here_change_this_in_production');
const hmacHeader = `sha256=${signature}`;
```

---

## Step 3: Message Format

### Required Message Structure
Send POST requests to `/api/chat-events` with this JSON structure:

```json
{
  "conversationId": "conv_12345",
  "contactId": "contact_67890", 
  "contactName": "John Doe",
  "messageBody": "Hello, I need help with my order",
  "actor": "customer",
  "timestamp": "2024-01-15T10:30:00Z",
  "messageId": "msg_unique_id",
  "channel": "web_chat"
}
```

### Field Descriptions
- **conversationId**: Unique identifier for the conversation thread
- **contactId**: GoHighLevel contact ID
- **contactName**: Customer's display name
- **messageBody**: The actual message text
- **actor**: Who sent the message (`"customer"`, `"ai"`, or `"agent"`)
- **timestamp**: ISO 8601 timestamp
- **messageId**: Unique message identifier
- **channel**: Communication channel (optional)

---

## Step 4: n8n Workflow Setup

### 4.1 Create New Workflow
1. Open n8n
2. Create a new workflow
3. Add the following nodes:

### 4.2 Webhook Trigger Node
```json
{
  "httpMethod": "POST",
  "path": "ghl-webhook",
  "responseMode": "responseNode"
}
```

### 4.3 GoHighLevel Message Processing Node
```javascript
// Extract message data from GoHighLevel webhook
const ghlData = $json;

return {
  conversationId: ghlData.conversation_id || `conv_${Date.now()}`,
  contactId: ghlData.contact_id,
  contactName: ghlData.contact_name || 'Unknown Customer',
  messageBody: ghlData.message_body || ghlData.text,
  actor: 'customer',
  timestamp: new Date().toISOString(),
  messageId: ghlData.message_id || `msg_${Date.now()}`,
  channel: ghlData.channel || 'web_chat'
};
```

### 4.4 AI Agent Processing Node (Optional)
```javascript
// Generate AI response using MCP or OpenAI
const customerMessage = $json;

// Call your AI service here
const aiResponse = await callAIService(customerMessage);

return [
  customerMessage, // Forward original message
  {
    ...customerMessage,
    messageBody: aiResponse,
    actor: 'ai',
    messageId: `ai_${Date.now()}`,
    timestamp: new Date().toISOString()
  }
];
```

### 4.5 HMAC Signature Node
```javascript
const crypto = require('crypto');

function generateHMAC(message, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

const payload = $json;
const messageBody = JSON.stringify(payload);
const secret = 'your_shared_hmac_secret_here_change_this_in_production';
const signature = generateHMAC(messageBody, secret);

return {
  payload: payload,
  signature: `sha256=${signature}`,
  messageBody: messageBody
};
```

### 4.6 HTTP Request Node (Send to Agent Desk)
```json
{
  "method": "POST",
  "url": "https://i-kunnect-crm-int.vercel.app/api/chat-events",
  "headers": {
    "Content-Type": "application/json",
    "X-Signature": "={{$json.signature}}"
  },
  "body": "={{$json.messageBody}}"
}
```

---

## Step 5: GoHighLevel Webhook Configuration

### 5.1 Set Up Webhook in GoHighLevel
1. Go to GoHighLevel Settings → Integrations → Webhooks
2. Create new webhook with these settings:
   - **URL:** `https://your-n8n-instance.com/webhook/ghl-webhook`
   - **Events:** Message Received, Conversation Started
   - **Method:** POST

### 5.2 Test Webhook
Send a test message through your GoHighLevel chat widget to verify the webhook is firing.

---

## Step 6: Testing the Integration

### 6.1 Manual Test with curl
```bash
# Generate HMAC signature first
MESSAGE='{"conversationId":"test_123","contactId":"contact_456","contactName":"Test Customer","messageBody":"Hello, I need help!","actor":"customer","timestamp":"2024-01-15T10:30:00Z","messageId":"msg_test_123","channel":"web_chat"}'

SIGNATURE=$(echo -n "$MESSAGE" | openssl dgst -sha256 -hmac "your_shared_hmac_secret_here_change_this_in_production" | cut -d' ' -f2)

# Send test message
curl -X POST https://i-kunnect-crm-int.vercel.app/api/chat-events \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=$SIGNATURE" \
  -d "$MESSAGE"
```

### 6.2 Check Agent Desk
1. Open your Agent Desk: `https://i-kunnect-crm-int.vercel.app`
2. The page should show "Integration Active" status
3. Check browser console for any errors

### 6.3 Verify API Response
```bash
# Check if conversation was created
curl https://i-kunnect-crm-int.vercel.app/api/conversations
```

---

## Step 7: Troubleshooting

### Common Issues

#### 1. HMAC Signature Errors
- **Error:** "Invalid signature"
- **Solution:** Ensure you're using the exact secret and generating HMAC correctly
- **Debug:** Check the signature generation in n8n

#### 2. No Messages Appearing
- **Check:** GoHighLevel webhook is firing
- **Check:** n8n workflow is processing messages
- **Check:** Agent Desk API is receiving requests
- **Debug:** Add console.log in n8n nodes

#### 3. TypeScript/Build Errors
- **Solution:** The current minimal Agent Desk page avoids complex UI issues
- **Status:** API endpoints work independently of UI complexity

### Debug Endpoints

#### Check System Status
```bash
curl https://i-kunnect-crm-int.vercel.app/api/conversations
```

#### Test Chat Events (with proper HMAC)
```bash
curl -X POST https://i-kunnect-crm-int.vercel.app/api/chat-events \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=YOUR_HMAC_HERE" \
  -d '{"conversationId":"debug_test","contactName":"Debug User","messageBody":"Test message","actor":"customer","timestamp":"2024-01-15T10:30:00Z"}'
```

---

## Step 8: Production Deployment

### Security Checklist
- [ ] Change HMAC secret from default value
- [ ] Use HTTPS for all endpoints
- [ ] Validate all incoming data
- [ ] Set up proper error logging
- [ ] Configure rate limiting

### Environment Variables
Update these in your Vercel deployment:
```
SHARED_HMAC_SECRET=your_production_secret_here
OPENAI_API_KEY=your_openai_key_here
```

---

## Summary

The integration flow is:
1. **Customer sends message** in GoHighLevel
2. **GoHighLevel webhook** triggers n8n workflow
3. **n8n processes message** and optionally generates AI response
4. **n8n sends message** to Agent Desk via `/api/chat-events`
5. **Agent Desk stores** conversation and displays in UI

The key is ensuring the HMAC signature is correctly generated and the message format matches the expected structure.

