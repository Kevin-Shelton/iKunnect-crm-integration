export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ ok: true, route: '/api/chat/session', expect: 'POST JSON { name/email/phone }' });
  }

  if (req.method === 'POST') {
    const { name, email, phone } = req.body;
    
    if (!name && !email && !phone) {
      return res.status(400).json({ success: false, error: 'At least one of name, email, or phone is required' });
    }

    // For now, return a mock response
    return res.json({
      success: true,
      data: {
        contactId: 'test-contact-123',
        isNewContact: true,
        contact: {
          id: 'test-contact-123',
          name: name || 'Test User',
          firstName: name?.split(' ')[0] || 'Test',
          lastName: name?.split(' ').slice(1).join(' ') || 'User',
          email: email || '',
          phone: phone || ''
        }
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}