import db from '@/lib/postgres-database';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid } = req.body;
    
    if (!fid) {
      return res.status(400).json({ error: 'FID is required' });
    }

    console.log('🧪 Adding test user with FID:', fid);
    
    // Add user to database with test notification settings
    const userData = {
      fid: parseInt(fid),
      username: 'volodeveth',
      wallet_address: '0x1B7B77DeA44F522c2d5695E526638eBE7c62a797', // Your wallet
      notification_url: 'https://notifications.farcaster.xyz/v1/send',
      notification_token: `test-token-${fid}`,
      notifications_enabled: true
    };

    const result = await db.upsertUser(userData);
    console.log('✅ Test user added:', result);
    
    return res.status(200).json({ 
      success: true,
      message: `Test user added with FID ${fid}`,
      user: {
        fid: userData.fid,
        username: userData.username,
        notifications_enabled: true
      }
    });

  } catch (error) {
    console.error('❌ Failed to add test user:', error);
    return res.status(500).json({
      error: 'Failed to add test user',
      message: error.message
    });
  }
}