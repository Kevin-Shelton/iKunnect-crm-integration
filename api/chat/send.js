export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ ok: true, route: '/api/chat/send', expect: 'POST JSON { contactId+body } or { conversationId+body }' });
  }

  if (req.method === 'POST') {
    const { contactId, body: msg, conversationId } = req.body;
    
    if (!msg) {
      return res.status(400).json({ success: false, error: 'Message body is required' });
    }

    // For now, return a mock response
    return res.json({
      success: true,
      data: {
        messageId: 'test-message-456',
        conversationId: conversationId || 'test-conversation-789',
        contactId: contactId || 'test-contact-123',
        body: msg,
        messageType: 'Live_Chat',
        timestamp: new Date().toISOString(),
        status: 'delivered'
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}