// ================== CONFIG ==================
const VERCEL_BASE = 'https://<your-app>.vercel.app'; // <-- CHANGE THIS to your deployed URL

// Global variables to store session data
let currentSession = null;
let currentThread = null;

// Decide which API base to use
let apiBaseUrl = (window.location.hostname.includes('vercel.app') || window.location.hostname.endsWith('.yourdomain.com'))
  ? window.location.origin
  : VERCEL_BASE; // fallback to Vercel when running locally

// ================== INIT ==================
document.addEventListener('DOMContentLoaded', function() {
  console.log('Chat interface loaded');
  console.log('API Base URL:', apiBaseUrl);
  setTimeout(testAPI, 500);
});

// ================== SESSION ==================
async function startChat() {
  const name = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const phone = document.getElementById('userPhone').value.trim();

  if (!name || !email) {
    addMessage('system', 'Please enter your name and email to start the chat.');
    return;
  }

  try {
    addMessage('system', 'Starting chat session...');

    // 1) Create/find contact
    const sessionResponse = await fetch(`${apiBaseUrl}/api/chat/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });

    const sessionText = await sessionResponse.text();
    let sessionData;
    try { sessionData = JSON.parse(sessionText); }
    catch {
      console.error('Session RAW:', sessionResponse.status, sessionText.slice(0, 200));
      throw new Error(`Session creation failed: ${sessionResponse.status} - Non-JSON response`);
    }
    if (!sessionResponse.ok || !sessionData.success) {
      throw new Error(`Session creation failed: ${sessionResponse.status} - ${sessionData?.error || 'Unknown error'}`);
    }

    currentSession = sessionData.data;
    console.log('Session created:', currentSession);
    addMessage('system', `Contact ${currentSession.isNewContact ? 'created' : 'found'}: ${currentSession.contact.name}`);

    // 2) Create REAL conversation thread (serverless will post an inbound seed)
    addMessage('system', 'Creating conversation thread...');
    const threadResponse = await fetch(`${apiBaseUrl}/api/chat/thread`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: currentSession.contactId })
    });

    const threadText = await threadResponse.text();
    let threadData;
    try { threadData = JSON.parse(threadText); }
    catch {
      console.error('Thread RAW:', threadResponse.status, threadText.slice(0, 200));
      throw new Error(`Thread creation failed: ${threadResponse.status} - Non-JSON response`);
    }
    if (!threadResponse.ok || !threadData.success) {
      throw new Error(`Thread creation failed: ${threadResponse.status} - ${threadData?.error || 'Unknown error'}`);
    }

    currentThread = threadData.data;
    console.log('Thread created:', currentThread);
    addMessage('system', `Conversation ${currentThread.isNewConversation ? 'created' : 'found'}: ${currentThread.conversationId}`);

    // Enable UI
    document.getElementById('setupForm')?.style?.setProperty('display', 'none');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (messageInput) {
      messageInput.disabled = false;
      messageInput.placeholder = 'Type your message...';
      messageInput.focus();
    }
    if (sendBtn) sendBtn.disabled = false;

    addMessage('bot', `Hello ${currentSession.contact.firstName || currentSession.contact.name}! I'm ready to help you. Your information has been saved to our CRM system.`);
  } catch (error) {
    console.error('Error starting chat:', error);
    addMessage('system', `Error starting chat: ${error.message}`);
  }
}

// ================== SEND ==================
async function sendMessage(messageText = null) {
  if (!currentSession || !currentThread) {
    addMessage('system', 'Please start a chat session first.');
    return;
  }

  const messageInput = document.getElementById('messageInput');
  const message = messageText || messageInput.value.trim();
  if (!message) return;

  if (!messageText) messageInput.value = '';

  addMessage('user', message);

  try {
    addMessage('system', 'Sending to CRM...');

    const sendResponse = await fetch(`${apiBaseUrl}/api/chat/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: currentThread.conversationId, // follow-up path (MCP)
        contactId: currentSession.contactId,
        body: message,
        channel: 'chat'
      })
    });

    const sendText = await sendResponse.text();
    let sendData;
    try { sendData = JSON.parse(sendText); }
    catch {
      console.error('Send RAW:', sendResponse.status, sendText.slice(0, 200));
      throw new Error(`Message send failed: ${sendResponse.status} - Non-JSON response`);
    }

    if (!sendResponse.ok || !sendData.success) {
      throw new Error(`Message send failed: ${sendResponse.status} - ${sendData?.error || 'Unknown error'}`);
    }

    console.log('Message sent:', sendData);
    addMessage('system', `Message sent to CRM: ${sendData.data.messageId}`);
    addMessage('system', 'Message delivered to GoHighLevel. If Conversation AI is enabled, the response will appear in your CRM.');
  } catch (error) {
    console.error('Error sending message:', error);
    addMessage('system', `Error sending message: ${error.message}`);
  }
}

// ================== UI HELPERS ==================
function addMessage(type, content) {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${type}`;

  const timestamp = new Date().toLocaleTimeString();
  if (type === 'user') {
    messageDiv.innerHTML = `<div class="message-content user-message"><strong>You:</strong> ${content}<div class="timestamp">${timestamp}</div></div>`;
  } else if (type === 'bot') {
    messageDiv.innerHTML = `<div class="message-content bot-message"><span class="bot-icon">🤖</span><div class="bot-text">${content}</div><div class="timestamp">${timestamp}</div></div>`;
  } else {
    messageDiv.innerHTML = `<div class="message-content system-message"><em>${content}</em><div class="timestamp">${timestamp}</div></div>`;
  }

  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function() {
  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  ['userName', 'userEmail', 'userPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          startChat();
        }
      });
    }
  });
});

function sendQuickResponse(message) { sendMessage(message); }

function debugSession() {
  console.log('Current Session:', currentSession);
  console.log('Current Thread:', currentThread);
  console.log('API Base URL:', apiBaseUrl);
}

// ================== HEALTH TEST ==================
async function testAPI() {
  try {
    const url = `${apiBaseUrl}/api/health`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    const text = await res.text();

    let data;
    try { data = JSON.parse(text); }
    catch {
      console.error('API /health RAW:', res.status, res.headers.get('content-type'), text.slice(0, 200));
      throw new Error(`HTTP ${res.status} — not JSON from ${url}`);
    }

    console.log('API Health:', data);
    if (data.success) {
      const name = data?.ghl?.locationName || 'GoHighLevel';
      addMessage('system', `✅ Connected to ${name}`);
    } else {
      addMessage('system', `❌ Connection failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('API Test failed:', error);
    addMessage('system', `❌ API Test failed: ${error.message}`);
  }
}
