const { findExistingContact, upsertContact } = require('../_lib/crm.js');

module.exports = async function handler(req, res) {
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

    try {
      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ');

      let contact = await findExistingContact(email, phone);
      let isNewContact = false;
      
      if (!contact) {
        contact = await upsertContact({ firstName, lastName, email, phone });
        isNewContact = true;
      }

      return res.json({
        success: true,
        data: {
          contactId: contact.id,
          isNewContact,
          contact: {
            id: contact.id,
            name: `${contact.firstName || firstName || ''} ${contact.lastName || lastName || ''}`.trim(),
            firstName: contact.firstName || firstName || '',
            lastName: contact.lastName || lastName || '',
            email: contact.email || email || '',
            phone: contact.phone || phone || ''
          }
        }
      });
    } catch (error) {
      console.error('[SESSION] Contact handling failed:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Contact handling failed: ${error.message}` 
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};