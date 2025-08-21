module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ 
      ok: true, 
      route: '/api/chat/session', 
      expect: 'POST JSON { name/email/phone }'
    });
  }

  if (req.method === 'POST') {
    const { name, email, phone } = req.body;
    
    if (!name && !email && !phone) {
      return res.status(400).json({ 
        success: false, 
        error: 'At least one of name, email, or phone is required' 
      });
    }

    const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
    const lastName = rest.join(' ');

    // Use the actual submitted name
    return res.json({
      success: true,
      data: {
        contactId: 'contact-' + Date.now(),
        isNewContact: true,
        contact: {
          id: 'contact-' + Date.now(),
          name: name || 'User',
          firstName: firstName || 'User',
          lastName: lastName || '',
          email: email || '',
          phone: phone || ''
        }
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};