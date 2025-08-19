// Global variables to store session data
let currentSession = null;
let currentThread = null;
let apiBaseUrl = window.location.origin;

// Initialize the chat interface
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat interface loaded');
    
    // Auto-detect API URL
    if (window.location.hostname.includes('vercel.app')) {
        apiBaseUrl = window.location.origin;
    }
    
    console.log('API Base URL:', apiBaseUrl);
    
    // Test API connection on load
    setTimeout(testAPI, 1000);
});

// Start chat session
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
        
        // Create session
        const sessionResponse = await fetch(`${apiBaseUrl}/api/chat/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json();
            throw new Error(`Session creation failed: ${sessionResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const sessionData = await sessionResponse.json();
        currentSession = sessionData.data;
        
        console.log('Session created:', currentSession);
        
        addMessage('system', `Contact ${currentSession.isNewContact ? 'created' : 'found'}: ${currentSession.contact.name}`);
        
        // Create conversation thread
        addMessage('system', 'Creating conversation thread...');
        
        const threadResponse = await fetch(`${apiBaseUrl}/api/chat/thread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                contactId: currentSession.contactId 
            })
        });
        
        if (!threadResponse.ok) {
            const errorData = await threadResponse.json();
            throw new Error(`Thread creation failed: ${threadResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const threadData = await threadResponse.json();
        currentThread = threadData.data;
        
        console.log('Thread created:', currentThread);
        
        addMessage('system', `Conversation ${currentThread.isNewConversation ? 'created' : 'found'}: ${currentThread.conversationId}`);
        
        // Enable chat interface
        document.getElementById('setupForm').style.display = 'none';
        
        // Enable message input and send button
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        
        if (messageInput) {
            messageInput.disabled = false;
            messageInput.placeholder = 'Type your message...';
            messageInput.focus();
        }
        
        if (sendBtn) {
            sendBtn.disabled = false;
        }
        
        addMessage('bot', `Hello ${currentSession.contact.firstName || currentSession.contact.name}! I'm ready to help you. Your information has been saved to our CRM system.`);
        
    } catch (error) {
        console.error('Error starting chat:', error);
        addMessage('system', `Error starting chat: ${error.message}`);
    }
}

// Send message
async function sendMessage(messageText = null) {
    if (!currentSession || !currentThread) {
        addMessage('system', 'Please start a chat session first.');
        return;
    }
    
    const messageInput = document.getElementById('messageInput');
    const message = messageText || messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // Clear input
    if (!messageText) {
        messageInput.value = '';
    }
    
    // Add user message to chat
    addMessage('user', message);
    
    try {
        // Send message to CRM
        addMessage('system', `Sending to CRM...`);
        
        const sendResponse = await fetch(`${apiBaseUrl}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                conversationId: currentThread.conversationId,
                contactId: currentSession.contactId,
                body: message 
            })
        });
        
        if (!sendResponse.ok) {
            const errorData = await sendResponse.json();
            throw new Error(`Message send failed: ${sendResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const sendData = await sendResponse.json();
        console.log('Message sent:', sendData);
        
        addMessage('system', `Message sent to CRM: ${sendData.data.messageId}`);
        
        // Note: GoHighLevel's Conversation AI will automatically respond
        // No need to call bot/process endpoint - the CRM handles responses
        addMessage('system', 'Message delivered to GoHighLevel. If Conversation AI is enabled, the response will appear in your CRM.');
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('system', `Error sending message: ${error.message}`);
    }
}

// Add message to chat display
function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Check if chat messages container exists
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    
    switch (type) {
        case 'user':
            messageDiv.innerHTML = `
                <div class="message-content user-message">
                    <strong>You:</strong> ${content}
                    <div class="timestamp">${timestamp}</div>
                </div>
            `;
            break;
        case 'bot':
            messageDiv.innerHTML = `
                <div class="message-content bot-message">
                    <span class="bot-icon">🤖</span>
                    <div class="bot-text">${content}</div>
                    <div class="timestamp">${timestamp}</div>
                </div>
            `;
            break;
        case 'system':
            messageDiv.innerHTML = `
                <div class="message-content system-message">
                    <em>${content}</em>
                    <div class="timestamp">${timestamp}</div>
                </div>
            `;
            break;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Handle Enter key in message input
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
    
    // Handle Enter key in form inputs
    const formInputs = ['userName', 'userEmail', 'userPhone'];
    formInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    startChat();
                }
            });
        }
    });
});

// Quick response buttons
function sendQuickResponse(message) {
    sendMessage(message);
}

// Debug function to check session state
function debugSession() {
    console.log('Current Session:', currentSession);
    console.log('Current Thread:', currentThread);
    console.log('API Base URL:', apiBaseUrl);
}

// Test API connection
async function testAPI() {
    try {
        const response = await fetch(`${apiBaseUrl}/api/health`);
        const data = await response.json();
        console.log('API Health:', data);
        
        if (data.success) {
            addMessage('system', `✅ Connected to ${data.ghl.locationName || 'GoHighLevel'}`);
        } else {
            addMessage('system', `❌ Connection failed: ${data.error}`);
        }
    } catch (error) {
        console.error('API Test failed:', error);
        addMessage('system', `❌ API Test failed: ${error.message}`);
    }
}

