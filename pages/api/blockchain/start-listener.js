import { startDuelListener, isListenerRunning } from '@/lib/blockchain';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (isListenerRunning()) {
      return res.status(200).json({ 
        ok: true, 
        message: 'Duel listener is already running' 
      });
    }

    await startDuelListener();
    
    return res.status(200).json({ 
      ok: true, 
      message: 'Duel listener started successfully' 
    });

  } catch (error) {
    console.error('❌ Failed to start duel listener:', error);
    return res.status(500).json({ 
      error: 'Failed to start duel listener',
      message: error.message 
    });
  }
}