# n8n AI Suggestions Workflow Setup

## Overview

The chat integration system uses n8n workflows to generate AI-powered response suggestions for agents. This guide shows how to set up the AI suggestions workflow in n8n.

## Workflow Structure

The AI suggestions workflow should:
1. **Receive webhook** from the chat system
2. **Process conversation context** 
3. **Generate AI suggestions** using OpenAI or other AI service
4. **Return formatted suggestions** to the chat system

## n8n Workflow Setup

### 1. Create New Workflow

1. Open your n8n instance
2. Create a new workflow
3. Name it "Chat AI Suggestions"

### 2. Add Webhook Trigger

1. Add a **Webhook** node as the trigger
2. Configure the webhook:
   - **HTTP Method**: POST
   - **Path**: `/webhook/ai-suggestions`
   - **Response Mode**: Respond to Webhook
3. Save and copy the webhook URL

### 3. Add Data Processing

Add a **Code** node to process the incoming data:

```javascript
// Extract conversation data
const conversationId = $json.conversationId;
const messages = $json.messages || [];
const context = $json.context || '';

// Build conversation context for AI
const conversationHistory = messages
  .slice(-5) // Last 5 messages
  .map(msg => `${msg.sender}: ${msg.text}`)
  .join('\n');

// Prepare data for AI service
return {
  conversationId,
  context: conversationHistory,
  prompt: `You are an AI assistant helping a customer service agent respond to customer inquiries. Based on the conversation below, suggest 3 helpful, professional responses that the agent could use.

Conversation:
${conversationHistory}

Please provide 3 different response suggestions that are:
1. Professional and helpful
2. Appropriate for customer service  
3. Varied in tone (empathetic, solution-focused, informative)

Respond with a JSON array of objects with "text", "reason", and "confidence" fields.`
};
```

### 4. Add AI Service Integration

#### Option A: OpenAI Integration
Add an **OpenAI** node:
- **Resource**: Chat
- **Operation**: Message a Model
- **Model**: gpt-3.5-turbo
- **Messages**: Use the prompt from previous node
- **Max Tokens**: 500
- **Temperature**: 0.7

#### Option B: HTTP Request to AI Service
Add an **HTTP Request** node:
- **Method**: POST
- **URL**: Your AI service endpoint
- **Headers**: Authorization, Content-Type
- **Body**: JSON with the conversation context

### 5. Format Response

Add another **Code** node to format the AI response:

```javascript
// Parse AI response
let suggestions;
try {
  const aiResponse = $json.choices?.[0]?.message?.content || $json.response;
  suggestions = JSON.parse(aiResponse);
} catch (error) {
  // Fallback suggestions if parsing fails
  suggestions = [
    {
      text: "Thank you for reaching out. I understand your concern and I'm here to help you resolve this issue.",
      reason: "Empathetic acknowledgment",
      confidence: 0.8
    },
    {
      text: "Let me look into this for you right away. Can you provide me with a few more details about what you're experiencing?",
      reason: "Solution-focused approach", 
      confidence: 0.9
    },
    {
      text: "I appreciate your patience. Based on what you've described, here are a few options we can explore to address your concern.",
      reason: "Informative and structured",
      confidence: 0.85
    }
  ];
}

// Format suggestions for chat system
const formattedSuggestions = suggestions.map((suggestion, index) => ({
  text: suggestion.text || suggestion.response || '',
  reason: suggestion.reason || 'AI-generated suggestion',
  confidence: suggestion.confidence || 0.8,
  rank: index + 1
}));

return {
  suggestions: formattedSuggestions,
  conversationId: $('Code').first().$json.conversationId,
  timestamp: new Date().toISOString()
};
```

### 6. Return Response

The webhook will automatically return the final node's output to the chat system.

## Environment Variables

Add these environment variables to your Vercel deployment:

```bash
N8N_AI_SUGGESTIONS_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ai-suggestions
```

## Testing the Workflow

### 1. Test in n8n
Use the webhook test feature with sample data:

```json
{
  "conversationId": "test-conv-1",
  "messages": [
    {
      "sender": "customer",
      "text": "I'm having trouble with my order"
    }
  ],
  "context": "customer: I'm having trouble with my order",
  "requestType": "ai-suggestions"
}
```

### 2. Test from Chat System
1. Send a message in the customer chat
2. Open the conversation in Agent Desk
3. Click "Show AI Assistant"
4. Verify suggestions appear

## Expected Response Format

The n8n workflow should return:

```json
{
  "suggestions": [
    {
      "text": "I understand your concern about your order. Let me help you resolve this issue right away.",
      "reason": "Empathetic response",
      "confidence": 0.9,
      "rank": 1
    },
    {
      "text": "Could you please provide your order number so I can look into the specific details?",
      "reason": "Information gathering",
      "confidence": 0.8,
      "rank": 2
    },
    {
      "text": "I apologize for any inconvenience. Let me check the status of your order and provide you with an update.",
      "reason": "Solution-focused",
      "confidence": 0.85,
      "rank": 3
    }
  ],
  "conversationId": "test-conv-1",
  "timestamp": "2025-01-18T14:30:00.000Z"
}
```

## Troubleshooting

### Workflow Not Triggering
- Check webhook URL is correctly set in Vercel environment variables
- Verify n8n workflow is active
- Check n8n logs for incoming requests

### AI Suggestions Not Appearing
- Test the webhook directly in n8n
- Check browser console for API errors
- Verify response format matches expected structure

### Poor Suggestion Quality
- Adjust the AI prompt in the workflow
- Increase context window (more messages)
- Fine-tune AI model parameters (temperature, max tokens)

## Security Considerations

- **Webhook Security**: Consider adding authentication to your n8n webhook
- **Data Privacy**: Ensure conversation data is handled securely
- **Rate Limiting**: Implement rate limiting to prevent abuse
- **Error Handling**: Add proper error handling for AI service failures

