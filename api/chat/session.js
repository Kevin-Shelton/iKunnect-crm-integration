module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Session endpoint called:', req.method, req.url);

    if (req.method === 'GET') {
      return res.json({ 
        ok: true, 
        route: '/api/chat/session', 
        expect: 'POST JSON { name/email/phone }'
      });
    }

    if (req.method === 'POST') {
      const { name, email, phone } = req.body;
      
      console.log('Session POST data:', { name, email, phone });
      
      if (!name && !email && !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one of name, email, or phone is required' 
        });
      }

      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ');

      // Return the submitted name data (not hardcoded "peter")
      return res.json({
        success: true,
        data: {
          contactId: 'test-contact-' + Date.now(),
          isNewContact: true,
          contact: {
            id: 'test-contact-' + Date.now(),
            name: name || 'Test User',
            firstName: firstName || 'Test',
            lastName: lastName || 'User',
            email: email || '',
            phone: phone || ''
          }
        }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Session endpoint error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error: ' + error.message,
      stack: error.stack
    });
  }
};