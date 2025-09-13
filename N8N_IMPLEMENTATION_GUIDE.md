# n8n Implementation Guide for Tracing System

## Part B: n8n Wire-taps and Trace IDs

This guide shows how to implement the tracing system in your n8n workflows to provide complete visibility from GoHighLevel through to the Agent Desk.

### 1. Generate Trace ID (First Node)

In the first Code node after `GHL_Inbound_Webhook`, add:

```javascript
// Generate a new trace ID once, reuse in all subsequent nodes via {{$json.traceId}}
return [{ 
  ...$json, 
  traceId: (Math.random().toString(36).slice(2) + Date.now().toString(36)) 
}];
```

### 2. Wire-tap HTTP Nodes

Create small HTTP Request nodes named `Tap_<step>` with these settings:

**Method:** POST  
**URL:** `https://i-kunnect-crm-int.vercel.app/api/desk/tap`

**Headers:**
```
Content-Type: application/json
x-trace-id: {{$json.traceId}}
```

**Body (Raw JSON):**
```json
{
  "note": "after_extract_identity",
  "payload": {
    "locationId": "={{$json.locationId}}",
    "contactId": "={{$json.contactId}}",
    "conversationId": "={{$json.conversationId}}",
    "text": "={{$json.text}}"
  }
}
```

### 3. Required Wire-tap Nodes

Create these tap nodes (copy/paste and update note and payload):

#### Tap_After_ExtractIdentity
```json
{
  "note": "after_extract_identity",
  "payload": {
    "locationId": "={{$json.locationId}}",
    "contactId": "={{$json.contactId}}",
    "conversationId": "={{$json.conversationId}}",
    "text": "={{$json.text}}"
  }
}
```

#### Tap_After_ResolveConversation
```json
{
  "note": "after_resolve_conversation",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "contactId": "={{$json.contactId}}",
    "resolved": true
  }
}
```

#### Tap_Before_Assist_Request
```json
{
  "note": "before_assist_request",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "queryText": "={{$json.queryText}}",
    "messageCount": "={{$json.messages.length}}"
  }
}
```

#### Tap_After_Assist_Response
```json
{
  "note": "after_assist_response",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "suggestionsCount": "={{$json.suggestions.length}}"
  }
}
```

#### Tap_Before_Mirror_Events
```json
{
  "note": "before_mirror_events",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "messagesCount": "={{$json.messages.length}}"
  }
}
```

#### Tap_Before_Mirror_Assist
```json
{
  "note": "before_mirror_assist",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "suggestionsCount": "={{$json.suggestions.length}}"
  }
}
```

### 4. Mirror Nodes Configuration

#### Events Mirror Node
**URL:** `https://i-kunnect-crm-int.vercel.app/api/chat-events`

**Headers:**
```
Content-Type: application/json
x-trace-id: {{$json.traceId}}
x-signature: sha256=<HMAC_SIGNATURE>
```

**Body:**
```json
{
  "conversation": { "id": "={{$json.conversationId}}" },
  "contact": { "id": "={{$json.contactId}}" },
  "messages": "={{$json.messages}}"
}
```

#### Assist Mirror Node
**URL:** `https://i-kunnect-crm-int.vercel.app/api/chat-assist`

**Headers:**
```
Content-Type: application/json
x-trace-id: {{$json.traceId}}
x-signature: sha256=<HMAC_SIGNATURE>
```

**Body:**
```json
{
  "conversation": { "id": "={{$json.conversationId}}" },
  "suggestions": "={{$json.suggestions}}"
}
```

### 5. HMAC Signature Generation

Add this code to generate HMAC signatures for mirror nodes:

```javascript
const crypto = require('crypto');

// Get the body as string
const body = JSON.stringify({
  conversation: { id: $json.conversationId },
  messages: $json.messages // or suggestions for assist
});

// Generate HMAC signature
const secret = 'your_shared_hmac_secret_here_change_this_in_production';
const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');

return [{ 
  ...$json, 
  hmacSignature: signature,
  requestBody: body 
}];
```

### 6. Wire-tap Best Practices

- **Non-blocking:** Set HTTP nodes to "Continue on Fail" to avoid stopping runs on debug glitches
- **Consistent trace ID:** Always use `{{$json.traceId}}` in x-trace-id header
- **Meaningful notes:** Use descriptive note names for easy debugging
- **Essential data only:** Include only key fields in payload to reduce noise

### 7. Agent Send Workflow

For agent responses, add:

#### Tap_Before_Agent_Mirror
```json
{
  "note": "before_agent_mirror",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "agentId": "={{$json.agentId}}",
    "messageText": "={{$json.messageText}}"
  }
}
```

### 8. Admin/History Workflows

#### Tap_Before_Mirror_History
```json
{
  "note": "before_mirror_history",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "historicalMessagesCount": "={{$json.messages.length}}"
  }
}
```

#### Tap_Before_Mirror_Admin
```json
{
  "note": "before_mirror_admin",
  "payload": {
    "conversationId": "={{$json.conversationId}}",
    "action": "={{$json.action}}",
    "agentId": "={{$json.agentId}}"
  }
}
```

## Debugging with Trace IDs

### Expected Flow
When you send a live chat "hi", you should see taps in this order:

1. `after_extract_identity`
2. `after_resolve_conversation`  
3. `before_assist_request`
4. `after_assist_response`
5. `before_mirror_events`
6. `before_mirror_assist`

### Debug URLs
- **Health Check:** `https://i-kunnect-crm-int.vercel.app/api/desk/health`
- **Debug Taps:** `https://i-kunnect-crm-int.vercel.app/api/desk/last`
- **Conversations:** `https://i-kunnect-crm-int.vercel.app/api/conversations`

### Troubleshooting

**If taps are missing:**
- First tap missing → webhook didn't fire; check HL → n8n webhook
- Taps exist until before_mirror_* but no conversations → Vercel rejected mirror calls; check HMAC

**If after_assist_response shows suggestions.length = 0:**
- Fix AI prompt/parsing in n8n workflow

**In Vercel Logs, search for `[Desk]`:**
```
[Desk] <traceId> chat-events conv= Kvz37pA… msg+ 1
[Desk] <traceId> chat-assist conv= Kvz37pA… sugg+ 3
```

This complete tracing system provides full visibility and makes debugging n8n → Vercel → Agent Desk integration straightforward.

