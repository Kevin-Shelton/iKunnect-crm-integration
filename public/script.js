// Chat Interface JavaScript
let currentSession = null;
let currentThread = null;

// Initialize chat when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Chat interface loaded');
    
    // Focus on name input
    const nameInput = document.getElementById('name');
    if (nameInput) {
        nameInput.focus();
    }
});

// Start chat session
async function startChat() {
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    
    if (!name || !email) {
        alert('Please enter your name and email address');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    try {
        addMessage('system', 'Starting chat session...');
        
        // Create session
        const sessionResponse = await fetch('/api/chat/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, email, phone })
        });
        
        if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json();
            throw new Error(`Session creation failed: ${sessionResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const sessionData = await sessionResponse.json();
        currentSession = sessionData.data;
        
        addMessage('system', `Welcome ${currentSession.contact.firstName || name}! Creating conversation thread...`);
        
        // Create conversation thread
        const threadResponse = await fetch('/api/chat/thread', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ contactId: currentSession.contactId })
        });
        
        if (!threadResponse.ok) {
            const errorData = await threadResponse.json();
            throw new Error(`Thread creation failed: ${threadResponse.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const threadData = await threadResponse.json();
        currentThread = threadData.data;
        
        // Hide form and show chat
        document.getElementById('chat-form').style.display = 'none';
        document.getElementById('chat-interface').style.display = 'block';
        
        // Show welcome message
        addMessage('system', `Chat session started! Your information has been saved to our CRM system.`);
        addMessage('bot', `Hello ${currentSession.contact.firstName || name}! I'm ready to help you. Your information has been saved to our CRM system.`);
        
        // Focus on message input
        document.getElementById('message-input').focus();
        
    } catch (error) {
        console.error('Error starting chat:', error);
        addMessage('system', `Error: ${error.message}`);
    }
}

// Send message
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    const message = messageInput.value.trim();
    
    if (!message) return;
    if (!currentSession || !currentThread) {
        alert('Please start a chat session first');
        return;
    }
    
    // Clear input and add user message
    messageInput.value = '';
    addMessage('user', message);
    
    try {
        // Show sending status
        addMessage('system', 'Sending to CRM...');
        
        // Send message to GoHighLevel
        const response = await fetch('/api/chat/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationId: currentThread.conversationId,
                contactId: currentSession.contactId,
                body: message
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Message send failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }
        
        const data = await response.json();
        
        // Show success message
        const messageId = data.data.messageId || 'undefined';
        addMessage('system', `Message sent to CRM: ${messageId}`);
        
        // Note: GoHighLevel's Conversation AI will automatically respond
        // The response will appear in the GoHighLevel interface
        // For a complete integration, you would need to implement webhooks
        // to receive the AI responses back to this chat interface
        
        addMessage('system', 'Message delivered to GoHighLevel. If Conversation AI is enabled, the response will appear in your CRM.');
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('system', `Error: ${error.message}`);
    }
}

// Add message to chat
function addMessage(type, content) {
    const messagesDiv = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    const timestamp = new Date().toLocaleTimeString();
    
    let icon = '';
    let label = '';
    
    switch(type) {
        case 'user':
            icon = '👤';
            label = 'You';
            break;
        case 'bot':
            icon = '🤖';
            label = 'Assistant';
            break;
        case 'system':
            icon = '⚙️';
            label = 'System';
            break;
        default:
            icon = '💬';
            label = 'Message';
    }
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-icon">${icon}</span>
            <span class="message-label">${label}</span>
            <span class="message-time">${timestamp}</span>
        </div>
        <div class="message-content">${content}</div>
    `;
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// Handle Enter key in message input
document.addEventListener('keypress', function(e) {
    if (e.target.id === 'message-input' && e.key === 'Enter') {
        e.preventDefault();
        sendMessage();
    }
    
    if ((e.target.id === 'name' || e.target.id === 'email' || e.target.id === 'phone') && e.key === 'Enter') {
        e.preventDefault();
        startChat();
    }
});

// Test API connection
async function testConnection() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        console.log('API Health Check:', data);
        
        if (data.success) {
            addMessage('system', `✅ Connected to ${data.ghl.locationName || 'GoHighLevel'}`);
        } else {
            addMessage('system', `❌ Connection failed: ${data.error}`);
        }
    } catch (error) {
        console.error('Connection test failed:', error);
        addMessage('system', `❌ Connection test failed: ${error.message}`);
    }
}

// Auto-test connection on load
window.addEventListener('load', function() {
    setTimeout(testConnection, 1000);
});

