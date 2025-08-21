module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Send endpoint called:', req.method, req.url);
    console.log('Request body:', req.body);

    if (req.method === 'GET') {
      return res.json({ 
        ok: true, 
        route: '/api/chat/send', 
        expect: 'POST JSON { contactId+body } or { conversationId+body }' 
      });
    }

    if (req.method === 'POST') {
      const { conversationId, contactId, body: msg, channel } = req.body;
      
      console.log('Send POST data:', { conversationId, contactId, msg, channel });
      
      if (!msg) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message body is required' 
        });
      }

      const text = String(msg).trim();
      if (!text) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message body cannot be empty' 
        });
      }

      // Return mock data for now
      return res.json({
        success: true,
        data: {
          messageId: 'mock-message-' + Date.now(),
          conversationId: conversationId || 'mock-conversation-' + Date.now(),
          contactId: contactId,
          body: text,
          messageType: 'Live_Chat',
          timestamp: new Date().toISOString(),
          status: 'delivered'
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Send endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message,
      stack: error.stack
    });
  }
};