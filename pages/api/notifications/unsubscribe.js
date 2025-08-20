import db from '@/lib/kv-database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, walletAddress } = req.body;
    
    console.log('📝 Unsubscribe request:', { fid, walletAddress });

    if (!fid && !walletAddress) {
      return res.status(400).json({ 
        error: 'Either fid or walletAddress is required' 
      });
    }

    let result;
    if (fid) {
      result = await db.updateUser(Number(fid), { notifications_enabled: false });
    } else {
      // Find user by wallet address first
      const user = await db.getUserByWallet(walletAddress);
      if (user) {
        result = await db.updateUser(user.fid, { notifications_enabled: false });
      } else {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    console.log('✅ User unsubscribed:', result);

    return res.status(200).json({ 
      ok: true, 
      message: 'Successfully unsubscribed from notifications' 
    });

  } catch (error) {
    console.error('❌ Unsubscribe error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}