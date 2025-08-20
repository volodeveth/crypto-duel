import Database from 'better-sqlite3';

// Простий webhook без SSO захисту
export default async function handler(req, res) {
  console.log('🔔 STANDALONE Farcaster webhook:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const event = req.body;
    
    const { 
      event: eventType, 
      fid, 
      userFid, 
      notificationDetails,
      username,
      user
    } = event;

    const savedFid = fid || userFid || user?.fid;
    
    console.log(`🔔 Processing: ${eventType} for FID: ${savedFid}`);

    if (eventType === 'miniapp_added' || eventType === 'notifications_enabled') {
      console.log('✅ User enabled notifications:', {
        fid: savedFid,
        username: username || user?.username,
        notificationDetails
      });

      // Відправити welcome повідомлення до основного додатку
      if (notificationDetails?.url && notificationDetails?.token) {
        console.log('🎉 Forwarding to main app for welcome notification...');
        
        try {
          const mainAppResponse = await fetch('https://crypto-duel-97rsi92th-volodeveths-projects.vercel.app/api/notifications/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fid: savedFid,
              username: username || user?.username,
              walletAddress: '0x' + '0'.repeat(40), // dummy address, буде оновлено пізніше
              notificationDetails
            })
          });
          
          console.log('Main app response status:', mainAppResponse.status);
        } catch (forwardError) {
          console.error('Failed to forward to main app:', forwardError);
        }
      }
    }

    return res.status(200).json({ 
      ok: true, 
      message: `Processed ${eventType} for FID ${savedFid}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}