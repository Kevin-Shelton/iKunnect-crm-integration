export async function sendInboundMessage({ contactId, text, provider = 'web_chat' }) {
  const fetch = (await import('node-fetch')).default;
  const base = process.env.CRM_BASE_URL || 'https://services.leadconnectorhq.com';
  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  
  if (!pit || !locationId) {
    throw new Error('Missing required env: CRM_PIT or CRM_LOCATION_ID');
  }

  // Try multiple payload variations to find what works
  const variations = [
    {
      name: 'standard_inbound',
      payload: {
        contactId,
        message: text,
        type: 'Live_Chat',
        provider,
        source: 'live_chat'
      }
    },
    {
      name: 'with_location',
      payload: {
        contactId,
        message: text,
        type: 'Live_Chat',
        provider,
        locationId
      }
    },
    {
      name: 'simple_format',
      payload: {
        contactId,
        message: text,
        type: 'Live_Chat'
      }
    }
  ];

  const headers = {
    Authorization: `Bearer ${pit}`,
    locationId,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Version: '2021-07-28'
  };

  for (const variation of variations) {
    try {
      console.log(`[CRM] Trying ${variation.name}:`, JSON.stringify(variation.payload, null, 2));

      const resp = await fetch(`${base}/conversations/messages/inbound`, {
        method: 'POST',
        headers,
        body: JSON.stringify(variation.payload)
      });

      const txt = await resp.text();
      console.log(`[CRM] ${variation.name} response:`, resp.status, txt);

      if (resp.ok) {
        console.log(`[CRM] ${variation.name} SUCCESS!`);
        return JSON.parse(txt);
      }
    } catch (err) {
      console.log(`[CRM] ${variation.name} failed:`, err.message);
      continue;
    }
  }

  // If inbound endpoint fails, try regular messages endpoint
  try {
    console.log('[CRM] Trying regular messages endpoint as fallback...');
    const fallbackPayload = {
      type: 'Live_Chat',
      contactId,
      message: text,
      provider
    };

    console.log('[CRM] Fallback payload:', JSON.stringify(fallbackPayload, null, 2));

    const resp = await fetch(`${base}/conversations/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fallbackPayload)
    });

    const txt = await resp.text();
    console.log('[CRM] Fallback response:', resp.status, txt);

    if (resp.ok) {
      console.log('[CRM] Fallback SUCCESS!');
      return JSON.parse(txt);
    }

    throw new Error(`All endpoints failed. Last error: ${resp.status} - ${txt}`);
  } catch (err) {
    console.error('[CRM] All message sending methods failed:', err.message);
    throw err;
  }
}