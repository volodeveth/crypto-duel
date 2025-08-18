export async function sendNotification(user, notificationData) {
  if (!user.notification_url || !user.notification_token) {
    throw new Error('User does not have notification settings configured');
  }

  const payload = {
    notificationId: notificationData.notificationId,
    title: notificationData.title,
    body: notificationData.body,
    targetUrl: notificationData.targetUrl,
    tokens: [user.notification_token]
  };

  try {
    const response = await fetch(user.notification_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Notification failed: ${response.status} ${response.statusText}`);
    }

    console.log(`Notification sent to FID ${user.fid}: ${notificationData.title}`);
    return true;
  } catch (error) {
    console.error(`Failed to send notification to FID ${user.fid}:`, error);
    throw error;
  }
}

export async function sendDuelResultNotification(user, { duelId, win, prizeEth }) {
  const notificationId = `duel-result-${duelId}-${user.fid}`;
  const title = win ? '🎉 You won your duel!' : '😔 Duel completed';
  const body = win
    ? `Congratulations! You won ${prizeEth} ETH in duel #${duelId}! 💰`
    : `You lost duel #${duelId}. Better luck next time! Try again? 🎮`;

  const notificationData = {
    notificationId,
    title,
    body,
    targetUrl: `https://cryptoduel.xyz/app`
  };

  return sendNotification(user, notificationData);
}

export async function sendBattleRoyaleResultNotification(user, { battleId, mode, playersCount, win, prizeEth }) {
  const notificationId = `battle-royale-result-${battleId}-${user.fid}`;
  const title = win ? '👑 You won the Battle Royale!' : '⚔️ Battle Royale completed';
  const body = win
    ? `Congratulations! You won ${prizeEth} ETH in ${mode} Battle Royale #${battleId} against ${playersCount-1} opponents! 💰👑`
    : `You were eliminated in ${mode} Battle Royale #${battleId}. ${playersCount} players competed. Try again? 🎮⚔️`;

  const notificationData = {
    notificationId,
    title,
    body,
    targetUrl: `https://cryptoduel.xyz/app`
  };

  return sendNotification(user, notificationData);
}

export async function sendDailyReminderNotification(user) {
  const today = new Date().toISOString().slice(0, 10);
  const notificationId = `daily-reminder-${today}-${user.fid}`;
  
  const messages = [
    "Ready for another crypto duel? 🎮 Challenge someone today!",
    "Your luck is waiting! Start a new ETH duel 💰",
    "Time to test your fortune! Join a crypto duel now! ⚡",
    "Feeling lucky? Challenge opponents in ETH duels! 🔥",
    "Battle Royale awaits! 👑 Join 5, 100, or 1000 player battles!",
    "Massive prizes in Battle Royale! 🔥 Which mode will you conquer?",
    "From duels to Battle Royale - your fortune awaits! ⚡👑"
  ];
  
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  const notificationData = {
    notificationId,
    title: 'Time to Battle! 🎯',
    body: randomMessage,
    targetUrl: 'https://cryptoduel.xyz/app'
  };

  return sendNotification(user, notificationData);
}

export default {
  sendNotification,
  sendDuelResultNotification,
  sendBattleRoyaleResultNotification,
  sendDailyReminderNotification
};