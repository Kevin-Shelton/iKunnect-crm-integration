module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({ ok: true, route: '/api/chat/session' });
  }

  if (req.method === 'POST') {
    const { name, email, phone } = req.body || {};
    
    return res.json({
      success: true,
      data: {
        contactId: 'loTzAAxIiM1jBoEjMyLG',
        isNewContact: false,
        contact: {
          id: 'loTzAAxIiM1jBoEjMyLG',
          name: name || 'Test User',
          firstName: (name || 'Test User').split(' ')[0],
          lastName: (name || 'Test User').split(' ').slice(1).join(' ') || '',
          email: email || 'test@example.com',
          phone: phone || '+1234567890'
        }
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};