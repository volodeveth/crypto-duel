export async function sendNotification(user, notificationData) {
  console.log(`🔔 sendNotification called for FID ${user.fid}`);
  console.log(`📤 Notification data:`, {
    notificationId: notificationData.notificationId,
    title: notificationData.title,
    body: notificationData.body?.substring(0, 100) + '...'
  });
  
  // Try Neynar API first if user tokens are missing or invalid
  if (!user.notification_url || !user.notification_token || user.notification_token.startsWith('test-token-')) {
    console.log('🔑 Using Neynar API key instead of user tokens');
    return await sendNotificationViaAPI(user, notificationData);
  }

  const payload = {
    notificationId: notificationData.notificationId,
    title: notificationData.title,
    body: notificationData.body,
    targetUrl: notificationData.targetUrl,
    tokens: [user.notification_token]
  };

  try {
    console.log(`🌐 Attempting fetch to URL: ${user.notification_url}`);
    console.log(`📦 Payload:`, payload);
    
    const response = await fetch(user.notification_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`📬 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`❌ Response body:`, responseText);
      throw new Error(`Notification failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ Notification sent successfully:`, responseData);
    console.log(`✅ Notification sent to FID ${user.fid}: ${notificationData.title}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification to FID ${user.fid}:`, error);
    console.error(`❌ Error details:`, {
      message: error.message,
      cause: error.cause,
      stack: error.stack
    });
    throw error;
  }
}

// Send notification using Neynar API key instead of user tokens
export async function sendNotificationViaAPI(user, notificationData) {
  const apiKey = process.env.NEYNAR_API_KEY;
  if (!apiKey) {
    throw new Error('Neynar API key not configured');
  }

  const payload = {
    recipient_fids: [user.fid],
    notification: {
      title: notificationData.title,
      body: notificationData.body,
      target_url: notificationData.targetUrl
    }
  };

  try {
    console.log(`🌐 Sending notification via Neynar API to FID ${user.fid}`);
    console.log(`📦 API Payload:`, payload);
    
    const response = await fetch('https://api.neynar.com/v2/farcaster/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey
      },
      body: JSON.stringify(payload)
    });

    console.log(`📬 Neynar API response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const responseText = await response.text();
      console.error(`❌ Neynar API error:`, responseText);
      throw new Error(`Neynar API failed: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ Notification sent via API:`, responseData);
    console.log(`✅ Notification sent to FID ${user.fid}: ${notificationData.title}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send notification via API to FID ${user.fid}:`, error);
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
  sendNotificationViaAPI,
  sendDuelResultNotification,
  sendBattleRoyaleResultNotification,
  sendDailyReminderNotification,
  sendBetPlacedNotification,
  sendWelcomeNotification
};