// test-tracing-system.js
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3002';
const SECRET = 'your_shared_hmac_secret_here_change_this_in_production';

function createHmacSignature(body, secret) {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

function generateTraceId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function testEndpoint(endpoint, payload, traceId, useHmac = true) {
  const body = JSON.stringify(payload);
  const headers = {
    'Content-Type': 'application/json',
    'X-Trace-Id': traceId
  };
  
  if (useHmac) {
    headers['X-Signature'] = createHmacSignature(body, SECRET);
  }
  
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body
    });
    
    const data = await response.json();
    console.log(`✅ ${endpoint}:`, {
      status: response.status,
      ok: data.ok,
      counts: data.counts,
      traceId: data.traceId || 'not returned'
    });
    return data;
  } catch (error) {
    console.log(`❌ ${endpoint}:`, error.message);
    return null;
  }
}

async function testGetEndpoint(endpoint, traceId) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'X-Trace-Id': traceId
      }
    });
    
    const data = await response.json();
    console.log(`✅ GET ${endpoint}:`, {
      status: response.status,
      ok: data.ok,
      conversationsCount: data.conversations?.length || 0,
      tapsCount: data.taps?.length || 0
    });
    return data;
  } catch (error) {
    console.log(`❌ GET ${endpoint}:`, error.message);
    return null;
  }
}

async function runComprehensiveTests() {
  console.log('🧪 Testing Complete Tracing System\n');
  
  const traceId = generateTraceId();
  console.log(`🔍 Using trace ID: ${traceId}\n`);
  
  // Test 1: Health check
  console.log('1. Testing health endpoint...');
  await testGetEndpoint('/api/desk/health', traceId);
  
  // Test 2: Manual tap
  console.log('\n2. Testing manual tap...');
  await testEndpoint('/api/desk/tap', {
    note: 'manual_test',
    payload: { test: 'data', traceId }
  }, traceId, false);
  
  // Test 3: Chat events with messages
  console.log('\n3. Testing chat-events with messages...');
  await testEndpoint('/api/chat-events', {
    conversation: { id: `test_conv_${traceId}` },
    contact: { id: `test_contact_${traceId}` },
    messages: [
      {
        id: `msg_1_${traceId}`,
        direction: 'inbound',
        type: 29,
        body: 'Hello from tracing test',
        conversationId: `test_conv_${traceId}`,
        contactId: `test_contact_${traceId}`,
        dateAdded: new Date().toISOString()
      },
      {
        id: `msg_2_${traceId}`,
        direction: 'outbound',
        type: 29,
        body: 'AI response from tracing test',
        conversationId: `test_conv_${traceId}`,
        contactId: `test_contact_${traceId}`,
        dateAdded: new Date().toISOString()
      }
    ]
  }, traceId);
  
  // Test 4: Chat assist with suggestions
  console.log('\n4. Testing chat-assist with suggestions...');
  await testEndpoint('/api/chat-assist', {
    conversation: { id: `test_conv_${traceId}` },
    suggestions: [
      'How can I help you today?',
      'Let me check that information for you',
      'Is there anything else I can assist with?'
    ]
  }, traceId);
  
  // Test 5: Chat history
  console.log('\n5. Testing chat-history...');
  await testEndpoint('/api/chat-history', {
    conversation: { id: `test_conv_${traceId}` },
    messages: [
      {
        id: `hist_msg_${traceId}`,
        direction: 'inbound',
        type: 29,
        body: 'Historical message',
        conversationId: `test_conv_${traceId}`,
        dateAdded: new Date().toISOString()
      }
    ]
  }, traceId);
  
  // Test 6: Chat admin
  console.log('\n6. Testing chat-admin...');
  await testEndpoint('/api/chat-admin', {
    conversation: { id: `test_conv_${traceId}` },
    action: 'assign',
    agentId: `agent_${traceId}`
  }, traceId);
  
  // Test 7: Get conversations list
  console.log('\n7. Testing conversations list...');
  await testGetEndpoint('/api/conversations', traceId);
  
  // Test 8: Get specific conversation
  console.log('\n8. Testing specific conversation...');
  await testGetEndpoint(`/api/conversations/test_conv_${traceId}`, traceId);
  
  // Test 9: Get taps and conversations from debug endpoint
  console.log('\n9. Testing debug endpoint (taps + conversations)...');
  const debugData = await testGetEndpoint('/api/desk/last', traceId);
  
  if (debugData) {
    console.log('\n📊 Debug Summary:');
    console.log(`   - Total taps: ${debugData.taps?.length || 0}`);
    console.log(`   - Total conversations: ${debugData.conversations?.length || 0}`);
    
    if (debugData.taps?.length > 0) {
      console.log('\n🔍 Recent taps:');
      debugData.taps.slice(-5).forEach(tap => {
        console.log(`   ${tap.t} [${tap.traceId}] ${tap.route} - ${tap.note}`);
      });
    }
    
    if (debugData.conversations?.length > 0) {
      console.log('\n💬 Conversations:');
      debugData.conversations.forEach(conv => {
        console.log(`   ${conv.id}: ${conv.messageCount} messages, ${conv.suggestionCount} suggestions`);
      });
    }
  }
  
  console.log('\n🎉 Complete tracing system tests finished!');
  console.log(`\n🔗 Debug URLs:`);
  console.log(`   Health: ${BASE_URL}/api/desk/health`);
  console.log(`   Debug:  ${BASE_URL}/api/desk/last`);
  console.log(`   Conversations: ${BASE_URL}/api/conversations`);
}

runComprehensiveTests().catch(console.error);

