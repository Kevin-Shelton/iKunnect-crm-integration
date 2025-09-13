// test-safe-endpoints.js
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3002';
const SECRET = 'your_shared_hmac_secret_here_change_this_in_production';

function createHmacSignature(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

async function testEndpoint(endpoint, payload) {
  const body = JSON.stringify(payload);
  const signature = createHmacSignature(body, SECRET);
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body
    });
    
    const data = await response.json();
    console.log(`✅ ${endpoint}:`, {
      status: response.status,
      ok: data.ok,
      counts: data.counts,
      hasArrays: {
        messages: Array.isArray(data.messages),
        suggestions: Array.isArray(data.suggestions)
      }
    });
    return data;
  } catch (error) {
    console.log(`❌ ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing Safe API Endpoints\n');
  
  // Test 1: chat-events with messages
  await testEndpoint('/api/chat-events', {
    conversation: { id: 'test_conv_123' },
    contact: { id: 'test_contact_456' },
    messages: [
      {
        id: 'msg_1',
        direction: 'inbound',
        type: 29,
        body: 'Hello test message',
        conversationId: 'test_conv_123',
        contactId: 'test_contact_456'
      }
    ]
  });
  
  // Test 2: chat-events with empty payload
  await testEndpoint('/api/chat-events', {});
  
  // Test 3: chat-assist with suggestions
  await testEndpoint('/api/chat-assist', {
    conversation: { id: 'test_conv_123' },
    suggestions: ['How can I help?', 'Let me check that for you']
  });
  
  // Test 4: chat-assist with empty payload
  await testEndpoint('/api/chat-assist', {});
  
  // Test 5: chat-history with messages
  await testEndpoint('/api/chat-history', {
    conversation: { id: 'test_conv_123' },
    messages: [
      {
        id: 'msg_2',
        direction: 'outbound',
        type: 29,
        body: 'Historical message',
        conversationId: 'test_conv_123'
      }
    ]
  });
  
  // Test 6: chat-admin with action
  await testEndpoint('/api/chat-admin', {
    conversation: { id: 'test_conv_123' },
    action: 'assign',
    agentId: 'agent_789'
  });
  
  console.log('\n🎉 Safe endpoint tests completed!');
}

runTests().catch(console.error);

