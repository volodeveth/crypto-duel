import db from '@/lib/kv-database';
import { sendWelcomeNotification } from '@/lib/notifications';

export const config = { 
  api: { 
    bodyParser: {
      sizeLimit: '1mb',
    }
  } 
};

export default async function handler(req, res) {
  console.log('🔔 PUBLIC Farcaster webhook received:', req.method);
  console.log('🔔 Headers:', JSON.stringify(req.headers, null, 2));
  console.log('🔔 Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    
    // Log the entire event for debugging
    console.log('📝 Full webhook event:', JSON.stringify(event, null, 2));
    
    const { 
      event: eventType, 
      fid, 
      userFid, 
      notificationDetails,
      username,
      user
    } = event;

    // Get FID from various possible fields
    const savedFid = fid || userFid || user?.fid;
    
    if (!savedFid) {
      console.log('⚠️ No FID found in webhook event');
      return res.status(200).json({ ok: true, message: 'No FID provided' });
    }

    console.log(`🔔 Processing event: ${eventType} for FID: ${savedFid}`);

    if (eventType === 'miniapp_added' || eventType === 'notifications_enabled') {
      console.log('✅ User enabled notifications:', {
        fid: savedFid,
        username: username || user?.username,
        notificationDetails
      });

      // Store or update user with notification settings
      const userData = {
        fid: savedFid,
        username: username || user?.username,
        notification_url: notificationDetails?.url,
        notification_token: notificationDetails?.token,
        notifications_enabled: true
      };

      const result = await db.upsertUser(userData);
      console.log('📝 User upserted:', result);
      
      // Send welcome notification if we have notification settings
      if (notificationDetails?.url && notificationDetails?.token) {
        try {
          console.log('🎉 Sending welcome notification to new subscriber...');
          await sendWelcomeNotification({
            fid: savedFid,
            notification_url: notificationDetails.url,
            notification_token: notificationDetails.token,
            notifications_enabled: true
          });
          console.log('✅ Welcome notification sent successfully!');
        } catch (welcomeError) {
          console.error('❌ Failed to send welcome notification:', welcomeError.message);
          // Don't fail the webhook if welcome notification fails
        }
      } else {
        console.log('ℹ️ No notification details available, skipping welcome notification');
      }

    } else if (eventType === 'notifications_disabled' || eventType === 'miniapp_removed') {
      console.log('❌ User disabled notifications for FID:', savedFid);
      
      const result = await db.updateUser(savedFid, { 
        notifications_enabled: false 
      });
      console.log('📝 User updated:', result);
    }

    return res.status(200).json({ 
      ok: true, 
      message: `Processed ${eventType} for FID ${savedFid}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}