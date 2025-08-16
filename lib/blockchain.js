import { ethers } from 'ethers';
import { sendDuelResultNotification } from './notifications.js';
import db from './database.js';

// Contract ABI for DuelCompleted event
const DUEL_COMPLETED_ABI = [
  "event DuelCompleted(uint256 indexed duelId, address indexed winner, uint256 prize, uint256 randomSeed)"
];

// Contract ABI for getDuel function  
const GET_DUEL_ABI = [
  "function getDuel(uint256 duelId) view returns (address player1, address player2, uint256 betAmount, bool completed, address winner, uint256 randomSeed)"
];

const CONTRACT_ABI = [...DUEL_COMPLETED_ABI, ...GET_DUEL_ABI];

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
    console.log('🔄 Duel listener already running');
    return;
  }

  try {
    const contractInstance = getContract();
    console.log('🎯 Starting duel listener for contract:', contractInstance.target);

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

    isListening = true;
    console.log('✅ Duel listener started successfully');

  } catch (error) {
    console.error('❌ Failed to start duel listener:', error);
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

export function stopDuelListener() {
  if (contract) {
    contract.removeAllListeners('DuelCompleted');
    isListening = false;
    console.log('🛑 Duel listener stopped');
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