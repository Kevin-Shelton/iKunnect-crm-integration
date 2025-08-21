module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({ 
    success: true, 
    message: "Health check OK",
    timestamp: new Date().toISOString(),
    env: {
      hasPit: !!process.env.CRM_PIT,
      hasLocationId: !!process.env.CRM_LOCATION_ID
    }
  });
};