let chatSession = null;
let conversationId = null;
const apiBaseUrl = window.location.origin; // Uses same domain as frontend

function addMessage(content, type = 'user', avatar = 'U') {
    const messagesContainer = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${content}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function addStatus(message, type = 'info') {
    const messagesContainer = document.getElementById('chatMessages');
    const statusDiv = document.createElement('div');
    statusDiv.className = `status ${type}`;
    statusDiv.textContent = message;
    messagesContainer.appendChild(statusDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

async function startChat() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();

    if (!name || !email) {
        alert('Please fill in name and email');
        return;
    }

    try {
        addStatus('Creating chat session...', 'info');

        // Step 1: Create chat session (contact)
        const sessionResponse = await fetch(`${apiBaseUrl}/api/chat/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                phone: phone || undefined,
                source: 'iKunnect Chat Widget',
                tags: ['Vercel Deployment', 'Live Chat']
            })
        });

        if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json().catch(() => ({}));
            throw new Error(`Session creation failed: ${sessionResponse.status} - ${errorData.error || 'Unknown error'}`);
        }

        const sessionData = await sessionResponse.json();
        chatSession = sessionData.data;
        
        addStatus(`✅ Contact ${chatSession.isNewContact ? 'created' : 'found'}: ${chatSession.contact.name}`, 'info');

        // Step 2: Create conversation thread
        const threadResponse = await fetch(`${apiBaseUrl}/api/chat/thread`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contactId: chatSession.contactId,
                channel: 'chat'
            })
        });

        if (!threadResponse.ok) {
            const errorData = await threadResponse.json().catch(() => ({}));
            throw new Error(`Thread creation failed: ${threadResponse.status} - ${errorData.error || 'Unknown error'}`);
        }

        const threadData = await threadResponse.json();
        conversationId = threadData.data.conversationId;
        
        addStatus(`✅ Conversation ${threadData.data.isNewConversation ? 'created' : 'found'}: ${conversationId}`, 'info');

        // Enable chat input
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
        document.getElementById('setupForm').classList.add('hidden');
        
        addMessage('Welcome! Your chat session is connected to the CRM. Try sending a message!', 'system', '🤖');
        
        // Focus on message input
        document.getElementById('messageInput').focus();

    } catch (error) {
        console.error('Error starting chat:', error);
        addStatus(`❌ Error: ${error.message}`, 'error');
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message || !conversationId) return;

    // Clear input and disable temporarily
    messageInput.value = '';
    messageInput.disabled = true;
    document.getElementById('sendBtn').disabled = true;

    // Add user message to chat
    addMessage(message, 'user', 'U');

    try {
        // Send message to API
        const response = await fetch(`${apiBaseUrl}/api/chat/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                conversationId: conversationId,
                body: message,
                channel: 'Chat'
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Message send failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
        }

        const messageData = await response.json();
        addStatus(`✅ Message sent to CRM: ${messageData.data.messageId}`, 'info');

        // Process message through bot
        const botResponse = await fetch(`${apiBaseUrl}/api/bot/process`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                contactId: chatSession.contactId,
                conversationId: conversationId,
                context: { source: 'vercel_chat_widget' }
            })
        });

        if (botResponse.ok) {
            const botData = await botResponse.json();
            addMessage(botData.data.response, 'bot', '🤖');
            
            if (botData.data.action) {
                addStatus(`🎯 Bot Action: ${botData.data.action} (Confidence: ${Math.round((botData.data.confidence || 0) * 100)}%)`, 'info');
            }
        } else {
            addMessage('I received your message and it\'s been saved to the CRM!', 'bot', '🤖');
        }

    } catch (error) {
        console.error('Error sending message:', error);
        addStatus(`❌ Error: ${error.message}`, 'error');
        addMessage('Sorry, there was an error processing your message. Please try again.', 'bot', '🤖');
    }

    // Re-enable input
    messageInput.disabled = false;
    document.getElementById('sendBtn').disabled = false;
    messageInput.focus();
}

// Handle Enter key in message input
document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-focus on name input when page loads
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('userName').focus();
});

