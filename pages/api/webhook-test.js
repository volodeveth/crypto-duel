export default async function handler(req, res) {
  console.log('🧪 Webhook test endpoint called');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('Query:', JSON.stringify(req.query, null, 2));
  
  return res.status(200).json({ 
    ok: true, 
    message: 'Webhook test successful',
    timestamp: new Date().toISOString(),
    method: req.method,
    hasBody: !!req.body,
    bodySize: JSON.stringify(req.body || {}).length
  });
}