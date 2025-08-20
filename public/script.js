// ------------------ CONFIG ------------------
const VERCEL_BASE = 'https://<your-app>.vercel.app'; // <-- change to your deployed URL

let currentSession = null; // { contactId, ... }
let currentThread = null;  // { conversationId, ... }

let apiBaseUrl =
  window.location.hostname.includes('vercel.app') ? window.location.origin : VERCEL_BASE;

// ------------------ INIT ------------------
document.addEventListener('DOMContentLoaded', () => {
  console.log('Chat interface loaded');
  console.log('API Base URL:', apiBaseUrl);
  setTimeout(testAPI, 500);

  const messageInput = document.getElementById('messageInput');
  if (messageInput) {
    messageInput.addEventListener('keypress', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  ['userName', 'userEmail', 'userPhone'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keypress', e => { if (e.key === 'Enter') { e.preventDefault(); startChat(); }});
  });
});

// ------------------ SESSION ------------------
async function startChat() {
  const name  = document.getElementById('userName').value.trim();
  const email = document.getElementById('userEmail').value.trim();
  const phone = document.getElementById('userPhone').value.trim();

  if (!name || !email) {
    addMessage('system', 'Please enter your name and email to start the chat.');
    return;
  }

  try {
    addMessage('system', 'Starting chat session...');

    // 1) Create/find contact
    const sessionRes  = await fetch(`${apiBaseUrl}/api/chat/session`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone })
    });
    const sessionTxt  = await sessionRes.text();
    let sessionJson;
    try { sessionJson = JSON.parse(sessionTxt); }
    catch { console.error('Session RAW:', sessionRes.status, sessionTxt.slice(0,200)); throw new Error(`Session creation failed: ${sessionRes.status} (non-JSON)`); }
    if (!sessionRes.ok || !sessionJson.success) throw new Error(sessionJson?.error || `Session failed: ${sessionRes.status}`);

    currentSession = sessionJson.data;
    addMessage('system', `Contact ${currentSession.isNewContact ? 'created' : 'found'}: ${currentSession.contact.name}`);

    // 2) Seed a REAL conversation (serverless will post inbound seed)
    addMessage('system', 'Creating conversation thread...');
    const threadRes  = await fetch(`${apiBaseUrl}/api/chat/thread`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactId: currentSession.contactId, channel: 'chat' })
    });
    const threadTxt  = await threadRes.text();
    let threadJson;
    try { threadJson = JSON.parse(threadTxt); }
    catch { console.error('Thread RAW:', threadRes.status, threadTxt.slice(0,200)); throw new Error(`Thread creation failed: ${threadRes.status} (non-JSON)`); }
    if (!threadRes.ok || !threadJson.success) throw new Error(threadJson?.error || `Thread failed: ${threadRes.status}`);

    currentThread = threadJson.data;
    addMessage('system', `Conversation created: ${currentThread.conversationId}`);

    // Enable UI
    document.getElementById('setupForm')?.style?.setProperty('display', 'none');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    if (messageInput) { messageInput.disabled = false; messageInput.placeholder = 'Type your message...'; messageInput.focus(); }
    if (sendBtn) sendBtn.disabled = false;

    addMessage('bot', `Hello ${currentSession.contact.firstName || currentSession.contact.name}! I'm ready to help you. Your information has been saved to our CRM system.`);
  } catch (err) {
    console.error('Error starting chat:', err);
    addMessage('system', `Error starting chat: ${err.message}`);
  }
}

// ------------------ SEND ------------------
async function sendMessage(messageText = null) {
  if (!currentSession || !currentThread) {
    addMessage('system', 'Please start a chat session first.');
    return;
  }

  const input = document.getElementById('messageInput');
  const message = messageText || (input ? input.value.trim() : '');
  if (!message) return;
  if (!messageText && input) input.value = '';

  addMessage('user', message);

  try {
    addMessage('system', 'Sending to CRM...');
    const sendRes = await fetch(`${apiBaseUrl}/api/chat/send`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: currentThread.conversationId, // follow-up path (MCP)
        contactId: currentSession.contactId,
        body: message,
        channel: 'chat'
      })
    });
    const sendTxt = await sendRes.text();
    let sendJson;
    try { sendJson = JSON.parse(sendTxt); }
    catch { console.error('Send RAW:', sendRes.status, sendTxt.slice(0,200)); throw new Error(`Message send failed: ${sendRes.status} (non-JSON)`); }
    if (!sendRes.ok || !sendJson.success) throw new Error(sendJson?.error || `Message send failed: ${sendRes.status}`);

    addMessage('system', `Message sent to CRM: ${sendJson.data.messageId}`);
    addMessage('system', 'Message delivered to GoHighLevel. If Conversation AI is enabled, the response will appear in your CRM.');
  } catch (err) {
    console.error('Error sending message:', err);
    addMessage('system', `Error sending message: ${err.message}`);
  }
}

// ------------------ UI HELPERS ------------------
function addMessage(type, content) {
  const box = document.getElementById('chatMessages');
  if (!box) return;
  const div = document.createElement('div');
  div.className = `message ${type}`;
  const ts = new Date().toLocaleTimeString();

  if (type === 'user') {
    div.innerHTML = `<div class="message-content user-message"><strong>You:</strong> ${content}<div class="timestamp">${ts}</div></div>`;
  } else if (type === 'bot') {
    div.innerHTML = `<div class="message-content bot-message"><span class="bot-icon">🤖</span><div class="bot-text">${content}</div><div class="timestamp">${ts}</div></div>`;
  } else {
    div.innerHTML = `<div class="message-content system-message"><em>${content}</em><div class="timestamp">${ts}</div></div>`;
  }
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

function sendQuickResponse(msg) { sendMessage(msg); }
function debugSession() {
  console.log('Current Session:', currentSession);
  console.log('Current Thread:', currentThread);
  console.log('API Base URL:', apiBaseUrl);
}

// ------------------ HEALTH TEST ------------------
async function testAPI() {
  try {
    const url = `${apiBaseUrl}/api/health`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const text = await res.text();
    console.log('[API /health RAW]', res.status, res.headers.get('content-type'), text.slice(0,200));
    let data;
    try { data = JSON.parse(text); } catch { addMessage('system', `❌ API Test: non-JSON (HTTP ${res.status})`); return; }
    if (data.success) {
      const name = data?.ghl?.locationName || 'GoHighLevel';
      addMessage('system', `✅ Connected to ${name}`);
    } else {
      const msg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      addMessage('system', `❌ Connection failed: ${msg}`);
    }
  } catch (err) {
    addMessage('system', `❌ API Test failed: ${err.message}`);
  }
}
