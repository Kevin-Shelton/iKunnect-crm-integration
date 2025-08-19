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
        document.getElementById('chatForm').style.display = 'block';
        document.getElementById('setupForm').style.display = 'none';
        
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
        
        // Process with bot
        const botResponse = await fetch(`${apiBaseUrl}/api/bot/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                message: message,
                contactId: currentSession.contactId,
                conversationId: currentThread.conversationId
            })
        });
        
        if (!botResponse.ok) {
            const errorData = await botResponse.json();
            throw new Error(`Bot processing failed: ${botResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const botData = await botResponse.json();
        console.log('Bot response:', botData);
        
        // Add bot response to chat
        addMessage('bot', botData.data.response);
        addMessage('system', `Bot Action: ${botData.data.action} (Confidence: ${Math.round(botData.data.confidence * 100)}%)`);
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('system', `Error sending message: ${error.message}`);
    }
}

// Add message to chat display
function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
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
});
