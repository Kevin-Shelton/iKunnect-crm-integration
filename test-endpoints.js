#!/usr/bin/env node

const crypto = require('crypto');

const BASE_URL = 'http://localhost:3002';
const SECRET = 'your_shared_hmac_secret_key_here_change_in_production';

function createHmacSignature(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

async function testEndpoint(endpoint, payload, options = {}) {
  const body = JSON.stringify(payload);
  const signature = options.skipSignature ? undefined : createHmacSignature(body, SECRET);
  
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (signature) {
    headers['x-signature'] = signature;
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body,
    });
    
    const result = await response.json();
    return {
      status: response.status,
      data: result,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

async function runTests() {
  console.log('🧪 Running Acceptance Tests for New API Endpoints\n');
  
  // Test 1: HMAC validation
  console.log('1. Testing HMAC validation...');
  
  // Test with invalid signature
  const invalidSigResult = await testEndpoint('/api/chat-events', {
    messages: [{ id: '1', direction: 'inbound', type: 29, body: 'test' }]
  }, { skipSignature: true });
  
  console.log('   Invalid signature:', invalidSigResult.status === 200 ? '✅ PASS (warning logged)' : '❌ FAIL');
  
  // Test with valid signature
  const validSigResult = await testEndpoint('/api/chat-events', {
    messages: [{ id: '1', direction: 'inbound', type: 29, body: 'test' }]
  });
  
  console.log('   Valid signature:', validSigResult.ok ? '✅ PASS' : '❌ FAIL');
  
  // Test 2: Message normalization
  console.log('\n2. Testing message normalization...');
  
  const normalizeResult = await testEndpoint('/api/chat-events', {
    conversation: { id: 'conv_123' },
    messages: [
      { id: '1', direction: 'inbound', type: 29, body: 'Customer message', messageType: 'TYPE_LIVE_CHAT' },
      { id: '2', direction: 'outbound', type: 29, body: 'Agent response' },
      { id: '3', direction: 'inbound', type: 30, body: 'Info message', messageType: 'TYPE_LIVE_CHAT_INFO_MESSAGE' }
    ]
  });
  
  console.log('   Message normalization:', normalizeResult.ok ? '✅ PASS' : '❌ FAIL');
  
  // Test 3: Chat-assist endpoint
  console.log('\n3. Testing chat-assist endpoint...');
  
  const assistResult = await testEndpoint('/api/chat-assist', {
    suggestions: ['How can I help you today?', 'Let me check that for you.', 'Is there anything else?'],
    conversation: { id: 'conv_123' }
  });
  
  console.log('   Chat assist with suggestions:', assistResult.ok && assistResult.data.suggestionsCount === 3 ? '✅ PASS' : '❌ FAIL');
  
  // Test invalid suggestions
  const invalidAssistResult = await testEndpoint('/api/chat-assist', {
    suggestions: 'not an array'
  });
  
  console.log('   Invalid suggestions format:', invalidAssistResult.status === 400 ? '✅ PASS' : '❌ FAIL');
  
  // Test 4: Chat-history endpoint
  console.log('\n4. Testing chat-history endpoint...');
  
  const historyResult = await testEndpoint('/api/chat-history', {
    conversation: { id: 'conv_456' },
    messages: [
      { id: '10', direction: 'inbound', type: 29, body: 'Historical message' }
    ]
  });
  
  console.log('   Chat history:', historyResult.ok ? '✅ PASS' : '❌ FAIL');
  
  // Test 5: Chat-admin endpoint
  console.log('\n5. Testing chat-admin endpoint...');
  
  const adminResult = await testEndpoint('/api/chat-admin', {
    conversation: { id: 'conv_789' },
    action: 'assign',
    agentId: 'agent_123'
  });
  
  console.log('   Chat admin:', adminResult.ok ? '✅ PASS' : '❌ FAIL');
  
  // Test 6: Invalid JSON
  console.log('\n6. Testing invalid JSON handling...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/chat-events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-signature': createHmacSignature('invalid json', SECRET)
      },
      body: 'invalid json',
    });
    
    const result = await response.json();
    console.log('   Invalid JSON:', response.status === 400 ? '✅ PASS' : '❌ FAIL');
  } catch (error) {
    console.log('   Invalid JSON: ❌ FAIL -', error.message);
  }
  
  console.log('\n🎉 Acceptance tests completed!');
}

// Run tests
runTests().catch(console.error);

