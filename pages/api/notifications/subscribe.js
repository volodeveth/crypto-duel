import db from '@/lib/database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, username, walletAddress } = req.body;
    
    console.log('📝 Subscription request:', { fid, username, walletAddress });

    if (!fid || !walletAddress) {
      return res.status(400).json({ 
        error: 'Missing required fields: fid and walletAddress' 
      });
    }

    // Store user data (notification URL and token will be set via webhook)
    const userData = {
      fid: Number(fid),
      username,
      wallet_address: walletAddress.toLowerCase(),
      notifications_enabled: true
    };

    const result = db.upsertUser(userData);
    console.log('✅ User subscribed:', result);

    return res.status(200).json({ 
      ok: true, 
      message: 'Successfully subscribed to notifications' 
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}