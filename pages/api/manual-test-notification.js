import { sendWelcomeNotification } from '@/lib/notifications';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fid, notificationUrl, notificationToken } = req.body;
    
    if (!fid || !notificationUrl || !notificationToken) {
      return res.status(400).json({ 
        error: 'Missing required fields: fid, notificationUrl, notificationToken' 
      });
    }

    console.log('🧪 Manual test notification for FID:', fid);
    
    const testUser = {
      fid,
      notification_url: notificationUrl,
      notification_token: notificationToken,
      notifications_enabled: true
    };

    await sendWelcomeNotification(testUser);
    
    return res.status(200).json({ 
      success: true,
      message: `Manual test notification sent to FID ${fid}`,
      user: {
        fid,
        notification_url: 'Present',
        notification_token: 'Present'
      }
    });

  } catch (error) {
    console.error('❌ Manual test notification error:', error);
    return res.status(500).json({
      error: 'Failed to send manual test notification',
      message: error.message,
      stack: error.stack
    });
  }
}