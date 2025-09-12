const crypto = require('crypto');

// Configuration
const ENDPOINT_URL = 'http://localhost:3000/api/chat-events';
const SHARED_SECRET = 'your_shared_hmac_secret_here_change_this_in_production';

// Test chat event
const testEvent = {
  conversationId: 'conv_test_123',
  contactId: 'contact_456',
  direction: 'inbound',
  actor: 'customer',
  text: 'Hello, I need help with my order!',
  timestamp: new Date().toISOString(),
  correlationId: 'corr_' + Date.now()
};

// Create HMAC signature
function createHmacSignature(body, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');
}

// Test function
async function testChatEventsEndpoint() {
  try {
    console.log('🧪 Testing Chat Events Endpoint');
    console.log('================================');
    
    // Prepare the request body
    const bodyString = JSON.stringify(testEvent);
    const signature = createHmacSignature(bodyString, SHARED_SECRET);
    
    console.log('📤 Sending test event:');
    console.log('  Conversation ID:', testEvent.conversationId);
    console.log('  Actor:', testEvent.actor);
    console.log('  Direction:', testEvent.direction);
    console.log('  Text:', testEvent.text);
    console.log('  Signature:', signature);
    console.log('');
    
    // Send the request
    const response = await fetch(ENDPOINT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature
      },
      body: bodyString
    });
    
    const responseData = await response.json();
    
    console.log('📥 Response:');
    console.log('  Status:', response.status);
    console.log('  Success:', responseData.success);
    console.log('  Message:', responseData.message);
    console.log('  Event ID:', responseData.eventId);
    console.log('  Total Events:', responseData.totalEvents);
    console.log('');
    
    if (response.ok) {
      console.log('✅ Test passed! Chat event was successfully received and stored.');
      
      // Test the GET endpoint to retrieve events
      console.log('🔍 Testing GET endpoint...');
      const getResponse = await fetch(`${ENDPOINT_URL}?conversationId=${testEvent.conversationId}`);
      const getResponseData = await getResponse.json();
      
      console.log('📥 GET Response:');
      console.log('  Status:', getResponse.status);
      console.log('  Events count:', getResponseData.events?.length || 0);
      console.log('  First event text:', getResponseData.events?.[0]?.text || 'N/A');
      
      if (getResponse.ok && getResponseData.events?.length > 0) {
        console.log('✅ GET endpoint test passed!');
      } else {
        console.log('❌ GET endpoint test failed!');
      }
      
    } else {
      console.log('❌ Test failed!');
      console.log('Error:', responseData.error);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testChatEventsEndpoint();

