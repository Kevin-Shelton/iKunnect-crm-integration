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
    try {
      const { name, email, phone } = req.body;
      
      if (!name && !email && !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'At least one of name, email, or phone is required' 
        });
      }

      console.log('[SESSION] Input:', { name, email, phone });

      // For now, let's use a hardcoded existing contact ID from your CRM
      // From the logs, I saw contact ID: loTzAAxIiM1jBoEjMyLG (john doe)
      const existingContactId = 'loTzAAxIiM1jBoEjMyLG';
      
      console.log('[SESSION] Using hardcoded existing contact:', existingContactId);

      return res.json({
        success: true,
        data: {
          contactId: existingContactId,
          isNewContact: false,
          contact: {
            id: existingContactId,
            name: name || 'John Doe',
            firstName: (name || 'John Doe').split(' ')[0] || 'John',
            lastName: (name || 'John Doe').split(' ').slice(1).join(' ') || 'Doe',
            email: email || 'john@example.com',
            phone: phone || '+1234567890'
          }
        }
      });

    } catch (error) {
      console.error('[SESSION] Error:', error);
      return res.status(500).json({ 
        success: false, 
        error: error.message
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};