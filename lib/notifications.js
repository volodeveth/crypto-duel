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

export async function sendBetPlacedNotification(user, { mode, betAmount, waitingPlayersCount, totalRequired }) {
  const notificationId = `bet-placed-${mode}-${user.fid}-${Date.now()}`;
  
  let gameMode, multiplier, statusText;
  switch(mode) {
    case 'DUEL':
      gameMode = 'Duel';
      multiplier = '1.8x';
      statusText = `Searching for opponent... (${waitingPlayersCount}/${totalRequired})`;
      break;
    case 'BR5':
      gameMode = 'Battle Royale 5';
      multiplier = '4.5x';
      statusText = `Waiting for players... (${waitingPlayersCount}/${totalRequired})`;
      break;
    case 'BR100':
      gameMode = 'Battle Royale 100';
      multiplier = '90x';
      statusText = `Gathering warriors... (${waitingPlayersCount}/${totalRequired})`;
      break;
    case 'BR1000':
      gameMode = 'Battle Royale 1000';
      multiplier = '900x';
      statusText = `Epic battle forming... (${waitingPlayersCount}/${totalRequired})`;
      break;
    default:
      gameMode = mode;
      multiplier = '???x';
      statusText = `Waiting for players...`;
  }

  const notificationData = {
    notificationId,
    title: `🎯 ${gameMode} Bet Placed!`,
    body: `Your ${betAmount} ETH bet is active! Potential win: ${multiplier} 💰 ${statusText} ⚡`,
    targetUrl: 'https://cryptoduel.xyz/user'
  };

  return sendNotification(user, notificationData);
}

export async function sendWelcomeNotification(user) {
  const notificationId = `welcome-${user.fid}-${Date.now()}`;
  
  const notificationData = {
    notificationId,
    title: 'Welcome to Crypto Duel! 🎮',
    body: 'Notifications are now enabled! You\'ll get alerts about game results, wins, and special events. Ready to battle? ⚡💰',
    targetUrl: 'https://cryptoduel.xyz/app'
  };

  return sendNotification(user, notificationData);
}

export default {
  sendNotification,
  sendDuelResultNotification,
  sendBattleRoyaleResultNotification,
  sendDailyReminderNotification,
  sendBetPlacedNotification,
  sendWelcomeNotification
};