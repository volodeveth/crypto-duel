import { getUserByAddress } from '@/lib/postgres-database.js';
import { sendBetPlacedNotification } from '@/lib/notifications.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerAddress, mode, betAmount, waitingPlayersCount, totalRequired } = req.body;

    if (!playerAddress || !mode || !betAmount) {
      return res.status(400).json({ 
        error: 'Missing required fields: playerAddress, mode, betAmount' 
      });
    }

    console.log(`🔔 Sending bet placed notification to ${playerAddress} for ${mode} with ${betAmount} ETH`);

    // Get user from database
    const user = await getUserByAddress(playerAddress);
    if (!user) {
      console.log(`⚠️ User not found for address ${playerAddress}`);
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.notifications_enabled) {
      console.log(`⚠️ Notifications disabled for user ${user.fid}`);
      return res.status(200).json({ message: 'Notifications disabled for user' });
    }

    // Send notification
    await sendBetPlacedNotification(user, {
      mode,
      betAmount,
      waitingPlayersCount: waitingPlayersCount || 1,
      totalRequired: totalRequired || (mode === 'DUEL' ? 2 : mode === 'BR5' ? 5 : mode === 'BR100' ? 100 : 1000)
    });

    console.log(`✅ Bet placed notification sent to FID ${user.fid}`);
    return res.status(200).json({ 
      success: true, 
      message: `Notification sent to ${user.username || user.fid}` 
    });

  } catch (error) {
    console.error('❌ Failed to send bet placed notification:', error);
    return res.status(500).json({ 
      error: 'Failed to send notification',
      details: error.message 
    });
  }
}