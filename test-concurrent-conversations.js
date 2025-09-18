#!/usr/bin/env node

const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

// Test scenarios for different conversation types
const testScenarios = [
  {
    conversationId: 'test-conv-001',
    customerName: 'Alice Johnson',
    messages: [
      'Hi, I need help with my order',
      'My order number is #12345',
      'It was supposed to arrive yesterday but I haven\'t received it yet'
    ]
  },
  {
    conversationId: 'test-conv-002', 
    customerName: 'Bob Smith',
    messages: [
      'Hello, I\'m having trouble logging into my account',
      'I keep getting an error message',
      'Can you help me reset my password?'
    ]
  },
  {
    conversationId: 'test-conv-003',
    customerName: 'Carol Davis',
    messages: [
      'Good morning, I have a question about billing',
      'I was charged twice for the same service',
      'Can you please look into this for me?'
    ]
  },
  {
    conversationId: 'test-conv-004',
    customerName: 'David Wilson',
    messages: [
      'Hi there, I want to return a product',
      'It doesn\'t fit properly',
      'What\'s your return policy?'
    ]
  },
  {
    conversationId: 'test-conv-005',
    customerName: 'Emma Brown',
    messages: [
      'Hello, I need technical support',
      'The app keeps crashing on my phone',
      'I\'ve tried restarting but it doesn\'t help'
    ]
  }
];

async function sendMessage(conversationId, messageText, messageIndex) {
  const payload = {
    conversation: {
      id: conversationId
    },
    message: {
      id: `msg_${conversationId}_${messageIndex}_${Date.now()}`,
      text: messageText
    },
    contact: {
      id: `contact_${conversationId}`,
      name: testScenarios.find(s => s.conversationId === conversationId)?.customerName || 'Test Customer'
    },
    channel: 'webchat',
    locationId: 'DKs2AdSvw0MGWJYyXwk1',
    lang: 'en'
  };

  try {
    const response = await fetch(`${BASE_URL}/api/livechat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ [${conversationId}] Message ${messageIndex + 1} sent: "${messageText.substring(0, 50)}..."`);
      return result;
    } else {
      console.error(`❌ [${conversationId}] Failed to send message ${messageIndex + 1}:`, result);
      return null;
    }
  } catch (error) {
    console.error(`❌ [${conversationId}] Error sending message ${messageIndex + 1}:`, error.message);
    return null;
  }
}

async function getConversationMessages(conversationId) {
  try {
    const response = await fetch(`${BASE_URL}/api/conversations/${conversationId}/messages?limit=10`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`📋 [${conversationId}] Retrieved ${result.messages.length} messages`);
      return result.messages;
    } else {
      console.error(`❌ [${conversationId}] Failed to get messages:`, result);
      return [];
    }
  } catch (error) {
    console.error(`❌ [${conversationId}] Error getting messages:`, error.message);
    return [];
  }
}

async function getConversationsList() {
  try {
    const response = await fetch(`${BASE_URL}/api/conversations`);
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log(`📋 Retrieved ${result.conversations.length} conversations from list API`);
      return result.conversations;
    } else {
      console.error(`❌ Failed to get conversations list:`, result);
      return [];
    }
  } catch (error) {
    console.error(`❌ Error getting conversations list:`, error.message);
    return [];
  }
}

async function testAISuggestions(conversationId, messages) {
  const payload = {
    conversationId,
    messages: messages.map((msg, index) => ({
      id: `msg_${conversationId}_${index}`,
      sender: 'customer',
      text: msg,
      timestamp: new Date().toISOString()
    }))
  };

  try {
    const response = await fetch(`${BASE_URL}/api/ai-suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    
    if (response.ok && result.ok) {
      console.log(`🤖 [${conversationId}] AI suggestions received: ${result.suggestions.length} suggestions (source: ${result.source})`);
      result.suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. "${suggestion.text.substring(0, 80)}..." (${suggestion.reason})`);
      });
      return result.suggestions;
    } else {
      console.error(`❌ [${conversationId}] Failed to get AI suggestions:`, result);
      return [];
    }
  } catch (error) {
    console.error(`❌ [${conversationId}] Error getting AI suggestions:`, error.message);
    return [];
  }
}

async function runConcurrentTest() {
  console.log('🚀 Starting concurrent conversation test...\n');

  // Phase 1: Send messages concurrently for all conversations
  console.log('📤 Phase 1: Sending messages concurrently...');
  const sendPromises = [];
  
  for (const scenario of testScenarios) {
    for (let i = 0; i < scenario.messages.length; i++) {
      sendPromises.push(
        sendMessage(scenario.conversationId, scenario.messages[i], i)
      );
      
      // Add small delay between messages in same conversation
      if (i < scenario.messages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Wait for all messages to be sent
  await Promise.all(sendPromises);
  console.log('\n✅ All messages sent!\n');

  // Phase 2: Wait a moment for processing
  console.log('⏳ Waiting for message processing...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Phase 3: Retrieve messages for each conversation
  console.log('📥 Phase 2: Retrieving messages for each conversation...');
  for (const scenario of testScenarios) {
    const messages = await getConversationMessages(scenario.conversationId);
    console.log(`   [${scenario.conversationId}] Messages in storage: ${messages.length}`);
  }
  console.log('');

  // Phase 4: Test conversations list API
  console.log('📋 Phase 3: Testing conversations list API...');
  const conversations = await getConversationsList();
  console.log(`   Found ${conversations.length} conversations in list`);
  conversations.forEach(conv => {
    console.log(`   - ${conv.id}: ${conv.messageCount} messages, status: ${conv.status}`);
  });
  console.log('');

  // Phase 5: Test AI suggestions for each conversation
  console.log('🤖 Phase 4: Testing AI suggestions...');
  for (const scenario of testScenarios) {
    await testAISuggestions(scenario.conversationId, scenario.messages);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between AI requests
  }

  console.log('\n🎉 Concurrent conversation test completed!');
  console.log('\n📊 Test Summary:');
  console.log(`   - Conversations tested: ${testScenarios.length}`);
  console.log(`   - Total messages sent: ${testScenarios.reduce((sum, s) => sum + s.messages.length, 0)}`);
  console.log(`   - Storage system: Unified (Supabase + Memory)`);
  console.log(`   - AI integration: n8n workflow`);
}

// Run the test
runConcurrentTest().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
