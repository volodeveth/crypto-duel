import db from '@/lib/database';
import { sendWelcomeNotification } from '@/lib/notifications';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    console.log('🧪 Testing notification for wallet:', walletAddress);
    
    // Find user by wallet address
    const user = db.getUserByWallet(walletAddress.toLowerCase());
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found. Make sure you\'re subscribed to notifications first.' 
      });
    }

    if (!user.notifications_enabled) {
      return res.status(400).json({ 
        error: 'Notifications are disabled for this user' 
      });
    }

    if (!user.notification_url || !user.notification_token) {
      return res.status(400).json({ 
        error: 'User has no notification settings configured' 
      });
    }

    console.log('📤 Sending test notification to FID:', user.fid);
    
    await sendWelcomeNotification(user);
    
    return res.status(200).json({ 
      ok: true, 
      message: `Test notification sent to FID ${user.fid}`,
      user: {
        fid: user.fid,
        username: user.username,
        wallet_address: user.wallet_address
      }
    });

  } catch (error) {
    console.error('❌ Test notification error:', error);
    return res.status(500).json({ 
      error: 'Failed to send test notification',
      message: error.message 
    });
  }
}