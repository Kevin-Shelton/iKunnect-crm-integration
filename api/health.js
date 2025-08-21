module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pit = process.env.CRM_PIT;
  const locationId = process.env.CRM_LOCATION_ID;
  const baseUrl = process.env.CRM_BASE_URL;

  res.json({ 
    success: true, 
    message: "Health check OK",
    timestamp: new Date().toISOString(),
    env: {
      hasPit: !!pit,
      hasLocationId: !!locationId,
      locationId: locationId, // Show the actual value
      pitPrefix: pit ? pit.substring(0, 8) + '...' : 'missing',
      baseUrl: baseUrl || 'default'
    }
  });
};