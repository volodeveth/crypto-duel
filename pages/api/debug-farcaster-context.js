export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      userAgent, 
      referrer, 
      isInIframe, 
      capabilities, 
      contextData,
      headers 
    } = req.body;

    console.log('🔍 Farcaster Context Debug:', {
      userAgent,
      referrer,
      isInIframe,
      capabilities: capabilities?.length || 0,
      contextData,
      headers: Object.keys(headers || {})
    });

    // Determine if this is a valid Farcaster context
    const isFarcasterEnvironment = 
      isInIframe && 
      (referrer?.includes('farcaster.xyz') || referrer?.includes('warpcast.com')) &&
      capabilities?.includes('actions.ready');

    return res.status(200).json({
      success: true,
      debug: {
        isFarcasterEnvironment,
        userAgent,
        referrer,
        isInIframe,
        capabilitiesCount: capabilities?.length || 0,
        hasUserContext: !!contextData?.user,
        hasClient: !!contextData?.client,
        troubleshooting: {
          message: isFarcasterEnvironment ? 
            'Valid Farcaster environment detected' : 
            'Not a valid Farcaster environment - notifications may not work',
          recommendations: isFarcasterEnvironment ? 
            ['Context looks good', 'Try subscribing to notifications'] :
            ['Open app through Farcaster', 'Make sure you are in an iframe context', 'Check if capabilities include actions.ready']
        }
      }
    });

  } catch (error) {
    console.error('❌ Farcaster context debug error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message
    });
  }
}