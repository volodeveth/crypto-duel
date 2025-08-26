import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ethers } from 'ethers';
import ShareButtons from '../components/ShareButtons';
import { EthWithUsd } from '../lib/ethPrice';
import { Wallet, Swords, ExternalLink, History, ArrowLeft } from 'lucide-react';

const CONTRACT_ABI = [
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)",
  "event BattleRoyaleCompleted(uint256 indexed battleId, address winner, uint256 prize, uint256 randomSeed)",
  "event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount, uint8 mode)",
  "event DuelStarted(uint256 indexed duelId, address player1, address player2, uint256 betAmount)",
  "event BattleRoyaleStarted(uint256 indexed battleId, uint8 mode, uint256 playersCount, uint256 betAmount)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))",
  "function getBattleRoyale(uint256 battleId) external view returns (tuple(uint256 id, uint8 mode, address[] players, uint256 betAmount, uint256 startTime, address winner, bool completed, uint256 randomSeed, uint256 requiredPlayers))",
  "function totalDuels() external view returns (uint256)",
  "function totalBattleRoyales() external view returns (uint256)",
  "function waitingPlayers(uint256 waitingId) external view returns (address player, uint256 betAmount, uint8 mode, uint256 joinTime, bool active)",
  "function getWaitingPlayersCount(uint8 mode, uint256 betAmount) external view returns (uint256)",
  "function waitingByModeAndBet(uint8 mode, uint256 betAmount, uint256 index) external view returns (uint256 waitingId)",
  "function cancelWaiting() external"
];

// Multiple RPC endpoints for fallback
const RPC_ENDPOINTS = [
  'https://mainnet.base.org',
  'https://base-mainnet.public.blastapi.io',
  'https://base.gateway.tenderly.co',
  'https://base-rpc.publicnode.com'
];
const BASESCAN = 'https://basescan.org';
// NEW GameHub V2 contract address with Battle Royale support
const CONTRACT_ADDRESS = '0xad82ce9aA3c98E0b72B90abc8F6aB15F795E12b6';

const short = (a='') => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

// Helper function to create provider with fallback
async function createProviderWithFallback() {
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      // Test the connection with a simple call
      await provider.getBlockNumber();
      console.log(`✅ Using RPC: ${rpcUrl}`);
      return provider;
    } catch (error) {
      console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
}

// Safe wrapper for contract calls with fallback
async function safeContractCall(methodName, ...args) {
  for (const rpcUrl of RPC_ENDPOINTS) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const result = await contract[methodName](...args);
      return result;
    } catch (error) {
      console.warn(`Contract call ${methodName} failed on ${rpcUrl}:`, error.message);
      continue;
    }
  }
  throw new Error(`All RPC endpoints failed for ${methodName}`);
}

// Cancel waiting bet function
async function cancelBet() {
  try {
    console.log('🔄 Cancelling bet...');
    console.log('🌍 Environment:', {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isFrame: window.parent !== window,
      hasEthereum: !!window.ethereum,
      userAgent: navigator.userAgent
    });
    
    let contract = null;
    let walletType = null;
    
    // Try Farcaster wallet first
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      console.log('📱 Checking Farcaster SDK:', {
        sdkAvailable: !!sdk,
        walletAvailable: !!(sdk && sdk.wallet),
        hasGetEthereumProvider: !!(sdk && sdk.wallet && sdk.wallet.getEthereumProvider),
        hasGetEvmProvider: !!(sdk && sdk.wallet && sdk.wallet.getEvmProvider)
      });
      
      if (sdk && sdk.wallet) {
        let farcasterProvider = null;
        if (sdk.wallet.getEthereumProvider) {
          console.log('🔄 Trying getEthereumProvider...');
          farcasterProvider = await sdk.wallet.getEthereumProvider();
        } else if (sdk.wallet.getEvmProvider) {
          console.log('🔄 Trying getEvmProvider...');
          farcasterProvider = await sdk.wallet.getEvmProvider();
        }
        
        if (farcasterProvider) {
          console.log('✅ Using Farcaster wallet for cancel');
          const ethersProvider = new ethers.BrowserProvider(farcasterProvider);
          const signer = await ethersProvider.getSigner();
          contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          walletType = 'farcaster';
        } else {
          console.log('⚠️ Farcaster provider not available');
        }
      }
    } catch (farcasterError) {
      console.log('⚠️ Farcaster wallet error:', farcasterError.message);
    }
    
    // Fallback to external wallet
    if (!contract) {
      if (!window.ethereum) {
        const errorMsg = 'No wallet available. Please connect your wallet first or use the mobile app for Farcaster wallet.';
        console.error('❌', errorMsg);
        alert(errorMsg);
        return;
      }
      
      console.log('✅ Using external wallet for cancel');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      walletType = 'external';
    }
    
    console.log(`🔗 Using ${walletType} wallet for transaction`);
    
    // Dynamic gas limit based on wallet type for cancelWaiting
    let gasLimit;
    if (walletType === 'farcaster') {
      gasLimit = 500000; // Higher gas limit for Farcaster Wallet (збільшено)
    } else {
      gasLimit = 450000; // Higher gas limit for External wallets (збільшено)
    }
    console.log(`⛽ Using ${walletType} wallet cancel gas limit: ${gasLimit}`);
    
    // Submit transaction
    console.log('📝 Submitting cancelWaiting transaction...');
    const tx = await contract.cancelWaiting({ gasLimit: gasLimit });
    
    console.log('✅ Transaction submitted:', tx.hash);
    console.log('🔗 Transaction URL:', `https://basescan.org/tx/${tx.hash}`);
    
    // Show user-friendly message
    const txMessage = `Cancel transaction submitted!\n\nTransaction: ${tx.hash}\n\nConfirming on blockchain...`;
    alert(txMessage);
    
    // Handle confirmation differently for Farcaster wallet
    if (walletType === 'farcaster') {
      console.log('📱 Farcaster wallet detected - skipping tx.wait() due to eth_getTransactionReceipt limitation');
      
      // Clear pendingLocal if it exists
      localStorage.removeItem('cd_currentWaiting');
      
      // Success message for Farcaster
      alert('🎉 Cancel transaction submitted successfully!\n\nYour transaction has been sent to the blockchain. Please check your wallet for the refund in a few minutes.\n\nTransaction: ' + tx.hash);
      
    } else {
      // Wait for confirmation for external wallets
      console.log('⏳ Waiting for transaction confirmation...');
      try {
        const receipt = await tx.wait();
        
        console.log('🎉 Transaction confirmed!', {
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
          status: receipt.status
        });
        
        // Clear pendingLocal if it exists
        localStorage.removeItem('cd_currentWaiting');
        
        // Success message
        alert('🎉 Bet cancelled successfully!\n\nYour ETH has been refunded to your wallet.');
        
      } catch (waitError) {
        console.log('⚠️ tx.wait() failed, but transaction was likely successful:', waitError.message);
        
        // Clear pendingLocal if it exists
        localStorage.removeItem('cd_currentWaiting');
        
        // Still show success since transaction was submitted
        alert('⚠️ Transaction submitted but confirmation failed.\n\nPlease check your wallet manually.\n\nTransaction: ' + tx.hash);
      }
    }
    
    return tx;
  } catch (error) {
    console.error('❌ Cancel transaction failed:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
      stack: error.stack
    });
    
    // Better error messages for common issues
    let userMessage = 'Cancel failed: ' + error.message;
    
    if (error.message.includes('user rejected')) {
      userMessage = 'Transaction was cancelled by user.';
    } else if (error.message.includes('insufficient funds')) {
      userMessage = 'Insufficient funds for gas fees.';
    } else if (error.message.includes('nonce')) {
      userMessage = 'Transaction nonce error. Please try again.';
    } else if (error.code === 'CALL_EXCEPTION') {
      userMessage = 'Smart contract call failed. You might not have an active bet to cancel.';
    }
    
    alert('❌ ' + userMessage);
    throw error;
  }
}

export default function UserPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [duels, setDuels] = useState([]);
  const [battleRoyales, setBattleRoyales] = useState([]);
  const [pendingLocal, setPendingLocal] = useState(null);
  const [activeTab, setActiveTab] = useState('duels'); // 'duels' or 'battles'
  const [waitingCounts, setWaitingCounts] = useState({}); // {mode: {betAmount: count}}

  useEffect(() => {
    // Auto-detect connected wallet on page load
    async function autoDetectWallet() {
      console.log('🔍 My Duels: Auto-detecting wallet...');
      
      try {
        // First, try to detect Farcaster wallet
        try {
          const { sdk } = await import('@farcaster/miniapp-sdk');
          if (sdk && sdk.wallet) {
            console.log('🎯 Checking Farcaster wallet...');
            
            let farcasterProvider = null;
            if (sdk.wallet.getEthereumProvider) {
              farcasterProvider = await sdk.wallet.getEthereumProvider();
            } else if (sdk.wallet.getEvmProvider) {
              farcasterProvider = await sdk.wallet.getEvmProvider();
            }
            
            if (farcasterProvider) {
              console.log('✅ Farcaster wallet provider found');
              const ethersProvider = new ethers.BrowserProvider(farcasterProvider);
              const signer = await ethersProvider.getSigner();
              const connectedAddress = await signer.getAddress();
              
              console.log('✅ Farcaster wallet address:', connectedAddress);
              setAddress(connectedAddress);
              
              // Auto-load games after detecting Farcaster wallet
              setTimeout(() => {
                loadMyDuelsWithAddress(connectedAddress);
                loadMyBattleRoyalesWithAddress(connectedAddress);
                setTimeout(() => loadWaitingCounts(connectedAddress), 200); // Delay waiting counts
              }, 100);
              return; // Exit early if Farcaster wallet found
            }
          }
        } catch (farcasterError) {
          console.log('ℹ️ Farcaster wallet not available:', farcasterError.message);
        }
        
        // Fallback to external wallet (MetaMask, etc.)
        console.log('🔍 Checking external wallet (MetaMask)...');
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const connectedAddress = accounts[0].address;
            console.log('✅ External wallet address:', connectedAddress);
            setAddress(connectedAddress);
            
            // Auto-load games after detecting external wallet
            setTimeout(() => {
              loadMyDuelsWithAddress(connectedAddress);
              loadMyBattleRoyalesWithAddress(connectedAddress);
              setTimeout(() => loadWaitingCounts(connectedAddress), 200); // Delay waiting counts
            }, 100);
          } else {
            console.log('ℹ️ No external wallet accounts found');
          }
        } else {
          console.log('ℹ️ No external wallet provider found');
        }
      } catch (error) {
        console.warn('❌ Failed to auto-detect wallet:', error.message);
      }
    }

    // Check for pending local data
    try {
      const raw = localStorage.getItem('cd_currentWaiting');
      if (raw) {
        const obj = JSON.parse(raw);
        // Only show if it's for the current contract
        if (obj.contractAddress === CONTRACT_ADDRESS) {
          setPendingLocal(obj);
          if (!address && obj.address) setAddress(obj.address);
        } else {
          // Remove old contract data
          localStorage.removeItem('cd_currentWaiting');
        }
      }
    } catch {}

    // Auto-detect wallet
    autoDetectWallet();
  }, []);

  async function connectAddress() {
    try {
      if (!window.ethereum) return alert('Install MetaMask or connect your wallet.');
      const prov = new ethers.BrowserProvider(window.ethereum);
      await prov.send('eth_requestAccounts', []);
      const signer = await prov.getSigner();
      const newAddress = await signer.getAddress();
      setAddress(newAddress);
      // Auto-load games after connecting
      setTimeout(() => {
        if (newAddress) {
          loadMyDuelsWithAddress(newAddress);
          loadMyBattleRoyalesWithAddress(newAddress);
          setTimeout(() => loadWaitingCounts(newAddress), 200); // Delay waiting counts
        }
      }, 500);
    } catch (e) {
      alert(e.message);
    }
  }

  async function loadMyDuels() {
    return loadMyDuelsWithAddress(address);
  }

  async function loadMyDuelsWithAddress(targetAddress) {
    if (!targetAddress) return alert('Enter your wallet address or connect.');
    setLoading(true);
    try {
      // Use fallback provider system
      const provider = await createProviderWithFallback();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const totalDuels = Number(await safeContractCall('totalDuels'));
      const max = Math.min(totalDuels, 2000);

      const iface = new ethers.Interface(CONTRACT_ABI);
      const duelCompletedTopic = iface.getEvent('DuelCompleted').topicHash;
      const playerWaitingTopic = iface.getEvent('PlayerWaiting').topicHash;
      const duelStartedTopic = iface.getEvent('DuelStarted').topicHash;
      
      const completedDuels = [];
      const pendingDuels = [];

      // Load all duels (simplified approach like Leaderboard)
      for (let i = 1; i <= max; i++) {
        try {
          const d = await safeContractCall('getDuel', i);
          
          // Skip if duel doesn't exist (empty data)
          if (!d.player1 || d.player1 === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          const meInDuel =
            d.player1?.toLowerCase() === targetAddress.toLowerCase() ||
            d.player2?.toLowerCase() === targetAddress.toLowerCase();

          if (!meInDuel) continue;

          if (d.completed) {
            const isWinner = d.winner?.toLowerCase() === targetAddress.toLowerCase();

            completedDuels.push({
              id: d.id?.toString() || String(i),
              player1: d.player1,
              player2: d.player2,
              betEth: Number(ethers.formatEther(d.betAmount || 0)),
              timestamp: Number(d.timestamp || 0) * 1000,
              winner: d.winner,
              isWinner,
              randomSeed: d.randomSeed?.toString() || '',
              txHash: null, // Will add later if needed
              completed: true
            });
          } else if (d.player2 && d.player2 !== '0x0000000000000000000000000000000000000000') {
            // Started but not completed duel
            pendingDuels.push({
              id: d.id?.toString() || String(i),
              player1: d.player1,
              player2: d.player2,
              betEth: Number(ethers.formatEther(d.betAmount || 0)),
              timestamp: Number(d.timestamp || 0) * 1000,
              completed: false
            });
          }
        } catch (error) {
          // Log error but continue with next duel instead of breaking
          console.warn(`Error loading duel ${i}:`, error.message);
          continue;
        }
      }

      // Load pending Duels from waitingPlayers (like Battle Royale logic)
      try {
        const betAmounts = ['10000000000000', '100000000000000', '1000000000000000', '10000000000000000']; // 0.00001, 0.0001, 0.001, 0.01 ETH
        const mode = 0; // Duels are mode 0
        
        for (const betAmount of betAmounts) {
          try {
            const waitingCount = await safeContractCall('getWaitingPlayersCount', mode, betAmount);
            
            if (waitingCount > 0) {
              // Check each waiting player to see if it's the current user
              for (let i = 0; i < waitingCount; i++) {
                try {
                  const waitingId = await safeContractCall('waitingByModeAndBet', mode, betAmount, i);
                  const waitingPlayer = await safeContractCall('waitingPlayers', waitingId);
                  
                  if (waitingPlayer.player.toLowerCase() === targetAddress.toLowerCase() && waitingPlayer.active) {
                    console.log(`Found pending Duel for user:`, {
                      waitingId: waitingId.toString(),
                      mode,
                      betAmount: ethers.formatEther(betAmount),
                      player: waitingPlayer.player
                    });
                    
                    // Add as pending duel
                    pendingDuels.push({
                      id: `pending-duel-${waitingId}`,
                      player1: waitingPlayer.player,
                      player2: '0x0000000000000000000000000000000000000000',
                      betEth: Number(ethers.formatEther(betAmount)),
                      timestamp: Number(waitingPlayer.joinTime) * 1000,
                      completed: false,
                      isWaiting: true,
                      mode: 0, // Duel mode
                      waitingId: waitingId.toString(),
                      isPending: true
                    });
                  }
                } catch (error) {
                  console.warn(`Error checking waitingId ${i} for mode ${mode}, betAmount ${betAmount}:`, error.message);
                  continue;
                }
              }
            }
          } catch (error) {
            console.warn(`Error checking waiting players for mode ${mode}, betAmount ${betAmount}:`, error.message);
            continue;
          }
        }
      } catch (e) {
        console.warn('Error loading pending duels from waitingPlayers:', e);
      }

      // Add pendingLocal as a pending duel if it exists and no matching duel found
      if (pendingLocal && pendingLocal.address?.toLowerCase() === targetAddress.toLowerCase()) {
        const hasMatchingDuel = [...pendingDuels, ...completedDuels].some(d => 
          d.player1.toLowerCase() === targetAddress.toLowerCase() &&
          Math.abs(d.betEth - pendingLocal.betEth) < 0.0000001 && // Same bet amount
          (d.mode || 0) === (pendingLocal.mode || 0) // Same mode
        );
        
        if (!hasMatchingDuel) {
          // Add pendingLocal as a pending game (could be duel or battle royale)
          pendingDuels.push({
            id: `local-waiting`,
            player1: targetAddress,
            player2: '0x0000000000000000000000000000000000000000',
            betEth: pendingLocal.betEth,
            timestamp: pendingLocal.startedAt || Date.now(),
            completed: false,
            isWaiting: true,
            mode: pendingLocal.mode || 0, // Include mode from localStorage
            txHash: pendingLocal.txHash // Include txHash for View transaction button
          });
        } else {
          // Clear if we found matching blockchain duel
          setPendingLocal(null);
          localStorage.removeItem('cd_currentWaiting');
        }
      }

      completedDuels.sort((a, b) => Number(b.id) - Number(a.id));
      pendingDuels.sort((a, b) => Number(b.id) - Number(a.id));
      setDuels([...pendingDuels, ...completedDuels]);
    } catch (e) {
      console.error(e);
      alert('Failed to load duels: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyBattleRoyales() {
    return loadMyBattleRoyalesWithAddress(address);
  }

  async function loadMyBattleRoyalesWithAddress(targetAddress) {
    if (!targetAddress) return;
    setLoading(true);
    try {
      const totalBattles = Number(await safeContractCall('totalBattleRoyales'));
      const max = Math.min(totalBattles, 1000);

      const battles = [];

      // Load all battle royales (similar to duels)
      for (let i = 1; i <= max; i++) {
        try {
          const br = await safeContractCall('getBattleRoyale', i);
          
          // Skip if battle royale doesn't exist
          if (!br.players || br.players.length === 0) {
            continue;
          }
          
          // Check if user is a participant
          const isParticipant = br.players.some(
            player => player.toLowerCase() === targetAddress.toLowerCase()
          );

          if (!isParticipant) continue;

          const isWinner = br.winner?.toLowerCase() === targetAddress.toLowerCase();
          const modeNames = { 1: 'BR5', 2: 'BR100', 3: 'BR1000' };

          battles.push({
            id: br.id?.toString() || String(i),
            mode: modeNames[Number(br.mode)] || 'Unknown',
            players: br.players,
            playersCount: Number(br.requiredPlayers),
            betEth: Number(ethers.formatEther(br.betAmount || 0)),
            timestamp: Number(br.startTime || 0) * 1000,
            winner: br.winner,
            isWinner,
            randomSeed: br.randomSeed?.toString() || '',
            completed: br.completed,
            totalPrize: Number(ethers.formatEther(br.betAmount || 0)) * Number(br.requiredPlayers)
          });
        } catch (error) {
          console.warn(`Error loading battle royale ${i}:`, error.message);
          continue;
        }
      }

      // Load pending Battle Royales from waitingPlayers
      try {
        const betAmounts = ['10000000000000', '100000000000000', '1000000000000000', '10000000000000000']; // 0.00001, 0.0001, 0.001, 0.01 ETH
        const modes = [1, 2, 3]; // BR5, BR100, BR1000
        const modeNames = { 1: 'BR5', 2: 'BR100', 3: 'BR1000' };
        const requiredPlayers = { 1: 5, 2: 100, 3: 1000 };
        const multipliers = { 1: '4.5x', 2: '90x', 3: '900x' };

        for (const mode of modes) {
          for (const betAmount of betAmounts) {
            try {
              const waitingCount = await safeContractCall('getWaitingPlayersCount', mode, betAmount);
              
              if (waitingCount > 0) {
                // Check each waiting player to see if it's the current user
                for (let i = 0; i < waitingCount; i++) {
                  try {
                    const waitingId = await safeContractCall('waitingByModeAndBet', mode, betAmount, i);
                    const waitingPlayer = await safeContractCall('waitingPlayers', waitingId);
                    
                    if (waitingPlayer.player.toLowerCase() === targetAddress.toLowerCase() && waitingPlayer.active) {
                      console.log(`Found pending ${modeNames[mode]} for user:`, {
                        waitingId: waitingId.toString(),
                        mode,
                        betAmount: ethers.formatEther(betAmount),
                        player: waitingPlayer.player
                      });
                      
                      // Add as pending battle royale
                      battles.push({
                        id: `pending-br-${waitingId}`,
                        mode: modeNames[mode],
                        players: [waitingPlayer.player],
                        playersCount: requiredPlayers[mode],
                        betEth: Number(ethers.formatEther(betAmount)),
                        timestamp: Number(waitingPlayer.joinTime) * 1000,
                        winner: null,
                        isWinner: false,
                        randomSeed: '',
                        completed: false,
                        isPending: true,
                        waitingId: waitingId.toString(),
                        totalPrize: Number(ethers.formatEther(betAmount)) * requiredPlayers[mode],
                        multiplier: multipliers[mode],
                        waitingCount: waitingCount,
                        modeId: mode
                      });
                    }
                  } catch (error) {
                    console.warn(`Error checking waitingId ${i} for mode ${mode}:`, error.message);
                  }
                }
              }
            } catch (error) {
              console.warn(`Error loading waiting count for mode ${mode}, betAmount ${betAmount}:`, error.message);
            }
          }
        }
      } catch (e) {
        console.warn('Error loading pending Battle Royales:', e);
      }

      // Separate pending and completed battles
      const pendingBattles = battles.filter(b => b.isPending);
      const completedBattles = battles.filter(b => !b.isPending);
      
      // Sort each category separately
      pendingBattles.sort((a, b) => Number(b.id) - Number(a.id));
      completedBattles.sort((a, b) => Number(b.id) - Number(a.id));
      
      // Combine: pending first, then completed
      setBattleRoyales([...pendingBattles, ...completedBattles]);
    } catch (e) {
      console.error('Failed to load battle royales:', e);
      alert('Failed to load battle royales: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWaitingCounts(targetAddress = address) {
    if (!targetAddress) return;
    
    console.log('🔍 My Duels: Loading waiting counts...');
    
    try {
      // Always use RPC provider for read-only operations (same as app.js hybrid approach)
      // Farcaster Wallet doesn't support eth_call, so we need RPC provider
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for waiting counts: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for waiting counts');
        return;
      }
      
      // EXACT same arrays as app.js
      const betAmounts = [
        { value: '10000000000000', label: '0.00001 ETH', eth: 0.00001 },
        { value: '100000000000000', label: '0.0001 ETH', eth: 0.0001 },
        { value: '1000000000000000', label: '0.001 ETH', eth: 0.001 },
        { value: '10000000000000000', label: '0.01 ETH', eth: 0.01 }
      ];

      const gameModes = [
        { id: 0, name: 'Duel', icon: 'Swords', players: 2, multiplier: '1.8x', color: 'from-blue-500 to-purple-600', desc: 'Classic 1v1 battle' },
        { id: 1, name: 'Battle Royale 5', icon: 'Users', players: 5, multiplier: '4.5x', color: 'from-green-500 to-blue-600', desc: '5 players, 1 winner' },
        { id: 2, name: 'Battle Royale 100', icon: 'Crown', players: 100, multiplier: '90x', color: 'from-orange-500 to-red-600', desc: '100 players epic battle' },
        { id: 3, name: 'Battle Royale 1000', icon: 'Crown', players: 1000, multiplier: '900x', color: 'from-purple-500 to-pink-600', desc: 'Legendary 1000 player war' }
      ];
      
      const counts = {};
      
      // EXACT same logic as app.js updateWaitingCounts
      console.log('🔄 Loading waiting counts from contract...');
      for (const mode of gameModes) {
        counts[mode.id] = {};
        for (const bet of betAmounts) {
          try {
            // Use direct contract call instead of safeContractCall for consistency with app.js
            const count = await readOnlyContract.getWaitingPlayersCount(mode.id, bet.value);
            counts[mode.id][bet.value] = Number(count);
            console.log(`Mode ${mode.id}, bet ${bet.eth} ETH: ${Number(count)} waiting`);
          } catch {
            counts[mode.id][bet.value] = 0;
          }
        }
      }
      
      console.log('✅ Waiting counts loaded:', counts);
      setWaitingCounts(counts);
    } catch (e) {
      console.error('❌ Failed to load waiting counts:', e);
    }
  }

  const hasAny = useMemo(() => duels.length > 0 || battleRoyales.length > 0, [duels, battleRoyales]);
  const pendingDuels = useMemo(() => duels.filter(d => !d.completed && (d.mode === undefined || d.mode === 0)), [duels]); // Only 1v1 duels
  const pendingBattleRoyales = useMemo(() => battleRoyales.filter(br => br.isPending), [battleRoyales]);
  const completedBattleRoyales = useMemo(() => battleRoyales.filter(br => !br.isPending), [battleRoyales]);
  const completedDuels = useMemo(() => duels.filter(d => d.completed && (d.mode === undefined || d.mode === 0)), [duels]); // Only 1v1 duels
  const completedBattleRoyalesFromDuels = useMemo(() => duels.filter(d => d.completed && d.mode > 0), [duels]); // Completed BR from duels array

  return (
    <>
      <Head>
        <title>My Games — Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon2.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="My Games - Crypto Duel" />
        <meta property="og:description" content="Check your crypto battles history and results" />
        <meta property="og:image" content="https://cryptoduel.xyz/image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://cryptoduel.xyz/image.png" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-3xl mx-auto p-4">
          {/* Header */}
          <div className="text-center mb-6">
            {/* Logo and title in same row */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/icon2.png" alt="Crypto Duel" className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">My Games</h1>
            </div>
            <div className="mt-2">
              <Link href="/app" className="text-sm text-purple-200 hover:text-purple-100 flex items-center gap-1 justify-center">
                <ArrowLeft size={14} /> Back to Game
              </Link>
            </div>
          </div>

          {/* Address input / connect */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20 shadow-xl">
            <label className="block text-sm text-gray-300 mb-2">Wallet address</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value.trim())}
                placeholder="0x..."
                className="flex-1 px-3 py-2 rounded bg-gray-900 border border-gray-700 text-white text-sm outline-none"
              />
              <div className="flex gap-2 sm:gap-2">
                <button onClick={connectAddress} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-1">
                  <Wallet size={14} /> Connect
                </button>
                <button onClick={() => { loadMyDuels(); loadMyBattleRoyales(); setTimeout(() => loadWaitingCounts(address), 200); }} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!address || loading}>
                  <History size={14} /> {loading ? 'Loading…' : 'Load history'}
                </button>
              </div>
            </div>
          </div>

          {/* Game Mode Tabs */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 mb-6 shadow-xl">
            <div className="flex">
              <button
                onClick={() => setActiveTab('duels')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-tl-2xl rounded-bl-2xl border-r border-white/20 transition-all duration-300 ${
                  activeTab === 'duels' 
                    ? 'bg-blue-600/50 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                🗡️ Duels ({pendingDuels.length + completedDuels.length})
              </button>
              <button
                onClick={() => setActiveTab('battles')}
                className={`flex-1 px-4 py-3 text-sm font-semibold rounded-tr-2xl rounded-br-2xl transition-all duration-300 ${
                  activeTab === 'battles' 
                    ? 'bg-purple-600/50 text-white' 
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                }`}
              >
                👑 Battle Royales ({pendingBattleRoyales.length + completedBattleRoyales.length + completedBattleRoyalesFromDuels.length})
              </button>
            </div>
          </div>

          {/* Duels Tab Content */}
          {activeTab === 'duels' && (
            <>
              {/* Pending duels */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden mb-6 shadow-xl">
            <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
              Pending duels {pendingDuels.length > 0 ? `(${pendingDuels.length})` : ''}
            </div>

            {pendingDuels.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400">
                No pending duels found.
              </div>
            )}

            {pendingDuels.length > 0 && (
              <div className="divide-y divide-gray-700">
                {pendingDuels.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-300">
                        {d.id.startsWith('local-') || d.id.startsWith('wait-') || d.id.startsWith('pending-') ? (
                          <span className="font-semibold text-white">Duel (Waiting)</span>
                        ) : (
                          <>
                            <Link href={`/duel/${d.id}`} className="underline decoration-dotted hover:text-white">
                              <span className="font-semibold text-white">Duel #{d.id}</span>
                            </Link>
                          </>
                        )}
                      </div>
                      <div className="text-lg font-semibold text-yellow-400">
                        ⏳ WAITING
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <div className="text-gray-400">Bet Amount</div>
                        <div className="font-semibold"><EthWithUsd amount={d.betEth} decimals={5} /></div>
                      </div>
                      <div>
                        <div className="text-gray-400">Mode</div>
                        <div className="font-semibold">1v1 Duel</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {short(d.player1)} vs {d.player2 === '0x0000000000000000000000000000000000000000' ? 'waiting...' : short(d.player2)} • {d.timestamp ? new Date(d.timestamp).toLocaleString() : ''} {d.isWaiting ? '(waiting for opponent)' : ''}
                    </div>
                    
                    {/* Players Waiting для pending duels */}
                    <div className="mt-3">
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <div className="text-gray-400">Players Waiting</div>
                          <div className="text-white font-semibold">
                            {(() => {
                              // For duels (mode = 0), show 1/2 as they need 2 players
                              const betValue = ethers.parseEther(d.betEth.toString()).toString();
                              const waitingForMode = waitingCounts[0] && waitingCounts[0][betValue] ? waitingCounts[0][betValue] : 1;
                              return `${waitingForMode}/2`;
                            })()}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Multiplier</div>
                          <div className="text-green-400 font-semibold">1.8x</div>
                        </div>
                      </div>
                    </div>
                    
                    {d.txHash && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-2">
                          TX: <span className="font-mono break-all">{d.txHash}</span>
                        </div>
                        <a className="inline-flex items-center gap-2 px-3 py-2 rounded bg-blue-600 hover:bg-blue-700 text-sm text-white transition-colors"
                           href={`${BASESCAN}/tx/${d.txHash}`}
                           target="_blank" rel="noopener noreferrer">
                          🔎 View transaction
                        </a>
                      </div>
                    )}
                    
                    {/* Share кнопки для pending duels */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">Share to find opponents:</div>
                      <ShareButtons 
                        message={`Looking for opponents in 1v1 duel! 🔥⚔️ 2 players needed, ${d.betEth.toFixed(5)} ETH entry. Join me in the arena!`}
                        url="https://cryptoduel.xyz"
                        className="flex-wrap"
                      />
                    </div>
                    
                    {/* Cancel Bet кнопка */}
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">Don't want to wait?</div>
                      <button 
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          
                          console.log('🔴 Cancel button clicked (Duels)');
                          
                          if (confirm('Are you sure you want to cancel your bet? Your ETH will be refunded.')) {
                            try {
                              console.log('✅ User confirmed cancel');
                              await cancelBet();
                              
                              console.log('🔄 Reloading data after successful cancel...');
                              // Reload games after cancel
                              setTimeout(() => {
                                if (address) {
                                  loadMyDuelsWithAddress(address);
                                  loadMyBattleRoyalesWithAddress(address);
                                  loadWaitingCounts(address);
                                }
                              }, 2000);
                            } catch (error) {
                              console.error('❌ Cancel operation failed:', error);
                              // Error is already shown in cancelBet function
                            }
                          } else {
                            console.log('❌ User cancelled the cancel operation');
                          }
                        }}
                        className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        🚫 Cancel Bet & Get Refund
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed duels */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
              Completed duels {completedDuels.length > 0 ? `(${completedDuels.length})` : ''}
            </div>

            {completedDuels.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400">
                {hasAny ? 'No completed duels found.' : address ? 'Click "Load history" to fetch your duel results.' : 'Enter your wallet address and click "Load history" to see your duels.'}
              </div>
            )}

            {completedDuels.length > 0 && (
              <div className="divide-y divide-gray-700">
                {completedDuels.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-300">
                        <Link href={`/duel/${d.id}`} className="underline decoration-dotted hover:text-white">
                          <span className="font-semibold text-white">Duel #{d.id}</span>
                        </Link>
                      </div>
                      <div className={`text-lg font-semibold ${d.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {d.isWinner ? '🏆 WON' : '💀 LOST'}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <div className="text-gray-400">Bet Amount</div>
                        <div className="font-semibold"><EthWithUsd amount={d.betEth} decimals={5} /></div>
                      </div>
                      <div>
                        <div className="text-gray-400">Mode</div>
                        <div className="font-semibold">1v1 Duel</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {short(d.player1)} vs {short(d.player2)} • {d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {d.txHash && (
                        <a
                          href={`${BASESCAN}/tx/${d.txHash}#eventlog`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                          <ExternalLink size={12} /> DuelCompleted on BaseScan
                        </a>
                      )}
                      <a
                        href={`${BASESCAN}/address/${CONTRACT_ADDRESS}#events`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                      >
                        <ExternalLink size={12} /> All contract events
                      </a>
                    </div>
                    <details className="mt-3 text-xs text-gray-300">
                      <summary className="cursor-pointer text-gray-400">Details (randomSeed)</summary>
                      <div className="mt-2 font-mono break-all">{d.randomSeed}</div>
                    </details>
                    
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">Share this duel result:</div>
                      <ShareButtons 
                        message={`Just ${d.isWinner ? 'WON' : 'fought'} a crypto duel! 🎮${d.isWinner ? '🏆' : '⚔️'} ${d.betEth.toFixed(5)} ETH bet on the blockchain. ${d.isWinner ? 'Victory tastes sweet!' : 'Ready for revenge!'}`}
                        url="https://cryptoduel.xyz"
                        className="flex-wrap"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
            </>
          )}

          {/* Battle Royales Tab Content */}
          {activeTab === 'battles' && (
            <>
              {/* Pending Battle Royales */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden mb-6 shadow-xl">
                <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
                  Pending battles {pendingBattleRoyales.length > 0 ? `(${pendingBattleRoyales.length})` : ''}
                </div>

                {pendingBattleRoyales.length === 0 && !loading && (
                  <div className="p-6 text-center text-gray-400">
                    No pending battles found.
                  </div>
                )}

                {pendingBattleRoyales.length > 0 && (
                  <div className="divide-y divide-gray-700">
                    {pendingBattleRoyales.map((d) => (
                      <div key={d.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm text-gray-300">
                            <span className="font-semibold text-white">Battle Royale #{d.id}</span>
                          </div>
                          <div className="text-yellow-400 font-semibold">
                            ⏳ WAITING
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <div className="text-gray-400">Bet Amount</div>
                            <div className="text-white font-semibold">
                              <EthWithUsd amount={d.betEth} decimals={5} />
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Mode</div>
                            <div className="text-white font-semibold">
                              {d.mode === 1 ? 'Battle Royale 5' : 
                               d.mode === 2 ? 'Battle Royale 100' : 
                               d.mode === 3 ? 'Battle Royale 1000' : 
                               `Mode ${d.mode}`}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                          <div>
                            <div className="text-gray-400">Players Waiting</div>
                            <div className="text-white font-semibold">
                              {(() => {
                                if (d.isPending) {
                                  // For pending Battle Royales, use the data we already have
                                  return `${d.waitingCount || 1}/${d.playersCount}`;
                                } else {
                                  // For duels, use the existing logic
                                  const totalNeeded = d.mode === 1 ? 5 : d.mode === 2 ? 100 : d.mode === 3 ? 1000 : 0;
                                  const betValue = ethers.parseEther(d.betEth.toString()).toString();
                                  const waitingForMode = waitingCounts[d.mode] && waitingCounts[d.mode][betValue] ? waitingCounts[d.mode][betValue] : 0;
                                  return `${waitingForMode}/${totalNeeded}`;
                                }
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Multiplier</div>
                            <div className="text-green-400 font-semibold">
                              {d.isPending && d.multiplier ? d.multiplier : 
                               d.mode === 1 ? '4.5x' : 
                               d.mode === 2 ? '90x' : 
                               d.mode === 3 ? '900x' : 
                               '1.8x'}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-400 mb-3">
                          {short(d.player1)} • {new Date(d.timestamp).toLocaleString()} (waiting for players)
                        </div>
                        
                        {d.txHash && (
                          <a 
                            href={`${BASESCAN}/tx/${d.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                          >
                            🔎 View transaction <ExternalLink size={12} />
                          </a>
                        )}

                        {/* Share buttons for pending Battle Royales */}
                        {d.isPending && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Share to find opponents:</div>
                            <ShareButtons 
                              message={`Looking for opponents in ${d.mode} battle royale! 🔥⚔️ ${d.playersCount} players needed, ${d.betEth.toFixed(5)} ETH entry. Join me in the arena!`}
                              url="https://cryptoduel.xyz"
                              className="flex-wrap"
                            />
                          </div>
                        )}

                        {/* Cancel Bet кнопка для pending Battle Royales */}
                        {d.isPending && (
                          <div className="mt-3 pt-3 border-t border-gray-700">
                            <div className="text-xs text-gray-400 mb-2">Don't want to wait?</div>
                            <button 
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                console.log('🔴 Cancel button clicked (Battle Royale)');
                                
                                if (confirm(`Are you sure you want to cancel your ${d.mode} battle royale bet? Your ETH will be refunded.`)) {
                                  try {
                                    console.log('✅ User confirmed cancel');
                                    await cancelBet();
                                    
                                    console.log('🔄 Reloading data after successful cancel...');
                                    // Reload games after cancel
                                    setTimeout(() => {
                                      if (address) {
                                        loadMyDuelsWithAddress(address);
                                        loadMyBattleRoyalesWithAddress(address);
                                        loadWaitingCounts(address);
                                      }
                                    }, 2000);
                                  } catch (error) {
                                    console.error('❌ Cancel operation failed:', error);
                                    // Error is already shown in cancelBet function
                                  }
                                } else {
                                  console.log('❌ User cancelled the cancel operation');
                                }
                              }}
                              className="w-full px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
                            >
                              🚫 Cancel Bet & Get Refund
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Battle Royales */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
                  Completed battles {(completedBattleRoyales.length + completedBattleRoyalesFromDuels.length) > 0 ? `(${completedBattleRoyales.length + completedBattleRoyalesFromDuels.length})` : ''}
                </div>

                {(completedBattleRoyales.length + completedBattleRoyalesFromDuels.length) === 0 && !loading && (
                  <div className="p-6 text-center text-gray-400">
                    {hasAny ? 'No completed battles found.' : address ? 'Click "Load history" to fetch your battle results.' : 'Enter your wallet address and click "Load history" to see your battles.'}
                  </div>
                )}

                {(completedBattleRoyales.length > 0 || completedBattleRoyalesFromDuels.length > 0) && (
                <div className="divide-y divide-gray-700">
                  {/* Battle Royales from API */}
                  {completedBattleRoyales.map((br) => (
                    <div key={`br-${br.id}`} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold text-white">Battle #{br.id}</span> • {br.mode}
                        </div>
                        <div className={`text-lg font-semibold ${br.isPending ? 'text-yellow-400' : br.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                          {br.isPending ? '⏳ WAITING' : br.isWinner ? '🏆 WON' : '💀 LOST'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <div className="text-gray-400">Bet Amount</div>
                          <div className="font-semibold"><EthWithUsd amount={br.betEth} decimals={5} /></div>
                        </div>
                        <div>
                          <div className="text-gray-400">Total Players</div>
                          <div className="font-semibold">{br.playersCount} players</div>
                        </div>
                      </div>

                      {br.timestamp > 0 && (
                        <div className="text-xs text-gray-400 mb-3">
                          {new Date(br.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      )}

                      {br.isWinner && (
                        <div className="bg-green-600/20 rounded-lg p-3 mb-3 border border-green-600/30">
                          <div className="text-sm text-green-300 mb-1">Prize Won:</div>
                          <div className="text-lg font-semibold text-green-400">
                            <EthWithUsd amount={br.totalPrize * 0.9} decimals={5} />
                          </div>
                          <div className="text-xs text-green-300 mt-1">90% of total pool (10% platform fee)</div>
                        </div>
                      )}

                      {/* Додаткова інформація для completed Battle Royales */}
                      {!br.isPending && (
                        <>
                          {/* Players info like in duels */}
                          <div className="mt-1 text-xs text-gray-400">
                            {br.players && br.players.length > 0 ? (
                              <>
                                {br.players.slice(0, 3).map((player, idx) => short(player)).join(' vs ')}
                                {br.players.length > 3 && ` + ${br.players.length - 3} more`}
                              </>
                            ) : (
                              `${br.playersCount} players`
                            )} • {br.timestamp ? new Date(br.timestamp).toLocaleString() : ''}
                          </div>
                          
                          {/* All contract events link */}
                          <div className="mt-2 grid gap-2 sm:grid-cols-2">
                            {br.txHash && (
                              <a
                                href={`${BASESCAN}/tx/${br.txHash}#eventlog`}
                                target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                              >
                                <ExternalLink size={12} /> BattleRoyaleCompleted on BaseScan
                              </a>
                            )}
                            <a
                              href={`${BASESCAN}/address/${CONTRACT_ADDRESS}#events`}
                              target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                            >
                              <ExternalLink size={12} /> All contract events
                            </a>
                          </div>
                          
                          {/* Details (randomSeed) */}
                          {br.randomSeed && (
                            <details className="mt-3 text-xs text-gray-300">
                              <summary className="cursor-pointer text-gray-400">Details (randomSeed)</summary>
                              <div className="mt-2 font-mono break-all">{br.randomSeed}</div>
                            </details>
                          )}
                        </>
                      )}

                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-400 mb-2">{br.isPending ? 'Share to find opponents:' : 'Share this battle result:'}</div>
                        <ShareButtons 
                          message={br.isPending 
                            ? `Looking for opponents in ${br.mode} battle royale! 🔥⚔️ ${br.playersCount} players needed, ${br.betEth.toFixed(5)} ETH entry. Join me in the arena!`
                            : `Just ${br.isWinner ? 'WON' : 'fought'} in a ${br.mode} battle royale! 🏆⚔️ ${br.playersCount} players, ${br.betEth.toFixed(5)} ETH each. ${br.isWinner ? 'Champion of the arena!' : 'The battle continues!'}`
                          }
                          url="https://cryptoduel.xyz"
                          className="flex-wrap"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Completed Battle Royales from Duels array */}
                  {completedBattleRoyalesFromDuels.map((d) => (
                    <div key={`duel-br-${d.id}`} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold text-white">Battle Royale #{d.id}</span>
                        </div>
                        <div className={`text-lg font-semibold ${d.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                          {d.isWinner ? '🏆 WON' : '💀 LOST'}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        <div>
                          <div className="text-gray-400">Bet Amount</div>
                          <div className="text-white font-semibold">
                            <EthWithUsd ethAmount={d.betAmount} />
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400">Mode</div>
                          <div className="text-white font-semibold">{d.modeName || `Mode ${d.mode}`}</div>
                        </div>
                      </div>
                      
                      {/* Players info like in duels */}
                      <div className="text-xs text-gray-400 mb-3">
                        Battle players • {new Date(d.timestamp * 1000).toLocaleString()}
                      </div>

                      {d.isWinner && d.winAmount && (
                        <div className="bg-green-600/20 rounded-lg p-3 mb-3 border border-green-600/30">
                          <div className="text-sm text-green-300 mb-1">Prize Won:</div>
                          <div className="text-lg font-semibold text-green-400">
                            <EthWithUsd ethAmount={d.winAmount} />
                          </div>
                        </div>
                      )}

                      {/* All contract events link */}
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {d.txHash && (
                          <a
                            href={`${BASESCAN}/tx/${d.txHash}#eventlog`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                          >
                            <ExternalLink size={12} /> BattleRoyaleCompleted on BaseScan
                          </a>
                        )}
                        <a
                          href={`${BASESCAN}/address/${CONTRACT_ADDRESS}#events`}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-xs transition-all duration-300 hover:scale-105 shadow-lg"
                        >
                          <ExternalLink size={12} /> All contract events
                        </a>
                      </div>
                      
                      {/* Details (randomSeed) */}
                      {d.randomSeed && (
                        <details className="mt-3 text-xs text-gray-300">
                          <summary className="cursor-pointer text-gray-400">Details (randomSeed)</summary>
                          <div className="mt-2 font-mono break-all">{d.randomSeed}</div>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </>
          )}

          <div className="text-center mt-6">
            <Link href="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 transition-all duration-300 hover:scale-105 shadow-lg font-semibold">
              <ArrowLeft size={16} /> Back to Game
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}