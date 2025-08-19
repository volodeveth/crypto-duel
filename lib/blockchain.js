import { ethers } from 'ethers';
import { sendDuelResultNotification, sendBattleRoyaleResultNotification } from './notifications.js';
import db from './database.js';

// Contract ABI for events and functions
const CONTRACT_ABI = [
  "event DuelCompleted(uint256 indexed duelId, address indexed winner, uint256 prize, uint256 randomSeed)",
  "event BattleRoyaleCompleted(uint256 indexed battleId, address indexed winner, uint256 prize, uint256 randomSeed)",
  "function getDuel(uint256 duelId) view returns (address player1, address player2, uint256 betAmount, bool completed, address winner, uint256 randomSeed)",
  "function getBattleRoyale(uint256 battleId) view returns (uint256 id, uint8 mode, address[] players, uint256 betAmount, uint256 startTime, address winner, bool completed, uint256 randomSeed, uint256 requiredPlayers)"
];

let provider = null;
let contract = null;
let isListening = false;

function getProvider() {
  if (!provider) {
    const rpcUrl = process.env.BASE_RPC_WSS || 'wss://base-mainnet.public.blastapi.io';
    provider = new ethers.WebSocketProvider(rpcUrl);
    
    provider.on('error', (error) => {
      console.error('❌ WebSocket provider error:', error);
      // Reconnect logic could be added here
    });
  }
  return provider;
}

function getContract() {
  if (!contract) {
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!contractAddress) {
      throw new Error('Contract address not configured');
    }
    contract = new ethers.Contract(contractAddress, CONTRACT_ABI, getProvider());
  }
  return contract;
}

export async function startDuelListener() {
  if (isListening) {
    console.log('🔄 GameHub listener already running');
    return;
  }

  try {
    const contractInstance = getContract();
    console.log('🎯 Starting GameHub V2 listener for contract:', contractInstance.target);

    // Listen for Duel completions
    contractInstance.on('DuelCompleted', async (duelId, winner, prize, randomSeed, event) => {
      console.log('🏆 DuelCompleted event received:', {
        duelId: duelId.toString(),
        winner,
        prize: ethers.formatEther(prize),
        randomSeed: randomSeed.toString(),
        blockNumber: event.log.blockNumber
      });

      try {
        await handleDuelCompleted(duelId, winner, prize);
      } catch (error) {
        console.error('❌ Error handling duel completion:', error);
      }
    });

    // Listen for Battle Royale completions
    contractInstance.on('BattleRoyaleCompleted', async (battleId, winner, prize, randomSeed, event) => {
      console.log('👑 BattleRoyaleCompleted event received:', {
        battleId: battleId.toString(),
        winner,
        prize: ethers.formatEther(prize),
        randomSeed: randomSeed.toString(),
        blockNumber: event.log.blockNumber
      });

      try {
        await handleBattleRoyaleCompleted(battleId, winner, prize);
      } catch (error) {
        console.error('❌ Error handling battle royale completion:', error);
      }
    });

    isListening = true;
    console.log('✅ GameHub V2 listener started successfully');

  } catch (error) {
    console.error('❌ Failed to start GameHub listener:', error);
    throw error;
  }
}

async function handleDuelCompleted(duelId, winner, prize) {
  const duelIdNum = Number(duelId);
  const winnerAddr = winner.toLowerCase();
  const prizeEth = ethers.formatEther(prize);

  console.log(`🎮 Processing duel ${duelIdNum} completion...`);

  try {
    // Get duel details to find both players
    const contractInstance = getContract();
    const duel = await contractInstance.getDuel(duelIdNum);
    
    const player1 = duel[0].toLowerCase();
    const player2 = duel[1].toLowerCase();
    const players = [player1, player2];

    console.log(`👥 Duel players: ${player1}, ${player2}`);
    console.log(`🏆 Winner: ${winnerAddr}`);

    // Send notifications to both players
    for (const playerAddr of players) {
      try {
        const user = db.getUserByWallet(playerAddr);
        
        if (!user) {
          console.log(`⚠️ No user found for wallet: ${playerAddr}`);
          continue;
        }

        if (!user.notifications_enabled) {
          console.log(`🔕 Notifications disabled for user: ${user.fid}`);
          continue;
        }

        if (!user.notification_url || !user.notification_token) {
          console.log(`⚠️ Missing notification settings for user: ${user.fid}`);
          continue;
        }

        const won = playerAddr === winnerAddr;
        console.log(`📬 Sending ${won ? 'win' : 'loss'} notification to FID: ${user.fid}`);

        await sendDuelResultNotification(user, {
          duelId: duelIdNum,
          win: won,
          prizeEth
        });

        // Update last notification sent timestamp
        db.updateUser(user.fid, { 
          last_notification_sent: new Date().toISOString() 
        });

        console.log(`✅ Notification sent to FID ${user.fid}`);

      } catch (error) {
        console.error(`❌ Failed to send notification to ${playerAddr}:`, error);
      }
    }

  } catch (error) {
    console.error(`❌ Error processing duel ${duelIdNum}:`, error);
  }
}

async function handleBattleRoyaleCompleted(battleId, winner, prize) {
  const battleIdNum = Number(battleId);
  const winnerAddr = winner.toLowerCase();
  const prizeEth = ethers.formatEther(prize);

  console.log(`👑 Processing battle royale ${battleIdNum} completion...`);

  try {
    // Get battle royale details to find all players
    const contractInstance = getContract();
    const battle = await contractInstance.getBattleRoyale(battleIdNum);
    
    const players = battle.players.map(p => p.toLowerCase());
    const mode = Number(battle.mode);
    const modeNames = { 1: 'BR5', 2: 'BR100', 3: 'BR1000' };
    const modeName = modeNames[mode] || 'Battle Royale';

    console.log(`👥 Battle Royale players: ${players.length} total`);
    console.log(`🏆 Winner: ${winnerAddr}`);
    console.log(`🎮 Mode: ${modeName}`);

    // Store battle royale data in database
    try {
      const battleData = {
        battle_id: battleIdNum,
        mode: modeName,
        bet_amount: battle.betAmount.toString(),
        players_count: players.length,
        winner_address: winnerAddr,
        total_prize: prize.toString(),
        start_time: Number(battle.startTime),
        end_time: Math.floor(Date.now() / 1000),
        random_seed: battle.randomSeed.toString(),
        completed: true,
        tx_hash: null
      };

      const result = db.createBattleRoyale(battleData);
      const battleRoyaleId = result.lastInsertRowid;

      // Add all participants
      for (let i = 0; i < players.length; i++) {
        const isWinner = players[i] === winnerAddr;
        db.addBRParticipant(battleRoyaleId, players[i], Number(battle.startTime), isWinner);
      }

      console.log(`✅ Battle Royale ${battleIdNum} stored in database`);
    } catch (dbError) {
      console.error(`❌ Error storing battle royale in database:`, dbError);
    }

    // Send notifications to all players using batch processing
    // Prioritize winner by putting them first
    const winnerFirst = [winnerAddr, ...players.filter(p => p.toLowerCase() !== winnerAddr)];
    const batchSize = 50; // Process in batches of 50 to respect rate limits
    let totalNotificationsSent = 0;
    
    console.log(`📬 Starting batch notification process for ${winnerFirst.length} players (winner prioritized)...`);
    
    for (let i = 0; i < winnerFirst.length; i += batchSize) {
      const batch = winnerFirst.slice(i, i + batchSize);
      console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}: players ${i + 1}-${Math.min(i + batchSize, winnerFirst.length)}`);
      
      let batchNotificationsSent = 0;
      
      for (const playerAddr of batch) {
      try {
        const user = db.getUserByWallet(playerAddr);
        
        if (!user) {
          console.log(`⚠️ No user found for wallet: ${playerAddr}`);
          continue;
        }

        if (!user.notifications_enabled || !user.br_notifications) {
          console.log(`🔕 BR notifications disabled for user: ${user.fid}`);
          continue;
        }

        if (!user.notification_url || !user.notification_token) {
          console.log(`⚠️ Missing notification settings for user: ${user.fid}`);
          continue;
        }

        const won = playerAddr === winnerAddr;
        console.log(`📬 Sending ${won ? 'win' : 'loss'} BR notification to FID: ${user.fid}`);

        await sendBattleRoyaleResultNotification(user, {
          battleId: battleIdNum,
          mode: modeName,
          playersCount: players.length,
          win: won,
          prizeEth
        });

        // Update last notification sent timestamp
        db.updateUser(user.fid, { 
          last_notification_sent: new Date().toISOString() 
        });

        console.log(`✅ BR notification sent to FID ${user.fid}`);
        batchNotificationsSent++;
        totalNotificationsSent++;

        // Small delay between individual notifications
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`❌ Failed to send BR notification to ${playerAddr}:`, error);
      }
    }
    
      console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} completed: ${batchNotificationsSent} notifications sent`);
      
      // Delay between batches (except for the last batch)
      if (i + batchSize < winnerFirst.length) {
        console.log(`⏱️ Waiting 5 seconds before next batch to respect rate limits...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log(`🎉 Batch notification process completed: ${totalNotificationsSent} notifications sent out of ${winnerFirst.length} total players`);

  } catch (error) {
    console.error(`❌ Error processing battle royale ${battleIdNum}:`, error);
  }
}

export function stopDuelListener() {
  if (contract) {
    contract.removeAllListeners('DuelCompleted');
    contract.removeAllListeners('BattleRoyaleCompleted');
    isListening = false;
    console.log('🛑 GameHub listener stopped');
  }
}

export function isListenerRunning() {
  return isListening;
}

export default {
  startDuelListener,
  stopDuelListener,
  isListenerRunning
};