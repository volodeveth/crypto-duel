import { useState, useEffect } from 'react';
import React from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';
import FarcasterInit from '../components/FarcasterInit';
import FarcasterAppDialog from '../components/FarcasterAppDialog';
import ShareButtons from '../components/ShareButtons';
import { EthWithUsd } from '../lib/ethPrice';
import { Wallet, Swords, Users, Crown, ExternalLink, Info } from 'lucide-react';

const CONTRACT_ABI = [
  "function joinGame(uint8) external payable",
  "function getWaitingPlayersCount(uint8 mode, uint256 betAmount) external view returns (uint256)",
  "function cancelWaiting() external",
  "function getAllowedBets() external view returns (uint256[])",
  "function getPlayerStats(address player) external view returns (uint256 totalGames, uint256 wins, uint256 totalWinnings)",
  "function owner() external view returns (address)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))",
  "function getBattleRoyale(uint256 battleId) external view returns (tuple(uint256 id, uint8 mode, address[] players, uint256 betAmount, uint256 startTime, address winner, bool completed, uint256 randomSeed, uint256 requiredPlayers))",
  "function totalDuels() external view returns (uint256)",
  "function totalBattleRoyales() external view returns (uint256)",
  "function getRequiredPlayers(uint8 mode) external pure returns (uint256)",
  "function getMultiplier(uint8 mode) external pure returns (uint256)",
  "function waitingPlayers(uint256 waitingId) external view returns (address player, uint256 betAmount, uint8 mode, uint256 joinTime, bool active)",
  "event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount, uint8 mode)",
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)",
  "event BattleRoyaleCompleted(uint256 indexed battleId, address winner, uint256 prize, uint256 randomSeed)"
];

export default function GameHubApp() {
  const baseUrl = 'https://cryptoduel.xyz';
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [farcasterUsername, setFarcasterUsername] = useState(null);
  const [walletType, setWalletType] = useState(null); // 'farcaster' or 'external'
  const [gameState, setGameState] = useState('loading'); // loading, disconnected, selecting, confirming, transaction_sent, waiting, result
  const [waitingCount, setWaitingCount] = useState({});
  const [selectedMode, setSelectedMode] = useState(0); // 0=Duel, 1=BR5, 2=BR100, 3=BR1000
  const [selectedBet, setSelectedBet] = useState(null);
  const [userStats, setUserStats] = useState({ totalGames: 0, wins: 0, totalWinnings: 0 });
  const [lastResult, setLastResult] = useState(null);
  const [gameResult, setGameResult] = useState(null); // For live result checking
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAnalytics, setAdminAnalytics] = useState({
    totalGames: 0,
    totalVolume: '0',
    totalCommissions: '0',
    gamesByBet: {},
    gamesByMode: { duels: 0, br5: 0, br100: 0, br1000: 0 },
    averageBet: '0',
    mostPopularBet: 'None'
  });

  const betAmounts = [
    { value: '10000000000000', label: '0.00001 ETH', eth: 0.00001 },
    { value: '100000000000000', label: '0.0001 ETH', eth: 0.0001 },
    { value: '1000000000000000', label: '0.001 ETH', eth: 0.001 },
    { value: '10000000000000000', label: '0.01 ETH', eth: 0.01 }
  ];

  const gameModes = [
    { id: 0, name: 'Duel', icon: Swords, players: 2, multiplier: '1.8x', color: 'from-blue-500 to-purple-600', desc: 'Classic 1v1 battle' },
    { id: 1, name: 'Battle Royale 5', icon: Users, players: 5, multiplier: '4.5x', color: 'from-green-500 to-blue-600', desc: '5 players, 1 winner' },
    { id: 2, name: 'Battle Royale 100', icon: Crown, players: 100, multiplier: '90x', color: 'from-orange-500 to-red-600', desc: '100 players epic battle' },
    { id: 3, name: 'Battle Royale 1000', icon: Crown, players: 1000, multiplier: '900x', color: 'from-purple-500 to-pink-600', desc: 'Legendary 1000 player war' }
  ];

  // NEW GameHub V2 contract address with Battle Royale support
  const CONTRACT_ADDRESS = '0xad82ce9aA3c98E0b72B90abc8F6aB15F795E12b6';
  const BASESCAN = 'https://basescan.org';

  useEffect(() => {
    setGameState('loading');
    
    // Clear old contract data
    try {
      const lastContractVersion = localStorage.getItem('cd_contract_version');
      if (lastContractVersion !== CONTRACT_ADDRESS) {
        console.log('🧹 New GameHub V2 detected, clearing cached data');
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cd_')) {
            localStorage.removeItem(key);
          }
        });
        localStorage.setItem('cd_contract_version', CONTRACT_ADDRESS);
      }
    } catch {}
    
    // Try to auto-reconnect wallet first
    autoReconnectWallet();
  }, []);

  async function autoReconnectWallet() {
    try {
      console.log('🔄 Attempting to auto-reconnect wallet...');
      
      // First priority: Check Farcaster Wallet (when in Farcaster context)
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');
        if (sdk && sdk.wallet) {
          console.log('🎯 Checking Farcaster wallet first...');
          
          let farcasterProvider = null;
          if (sdk.wallet.getEthereumProvider) {
            farcasterProvider = await sdk.wallet.getEthereumProvider();
          } else if (sdk.wallet.getEvmProvider) {
            farcasterProvider = await sdk.wallet.getEvmProvider();
          }
          
          if (farcasterProvider) {
            console.log('✅ Found Farcaster wallet provider, using it');
            const ethProvider = new ethers.BrowserProvider(farcasterProvider);
            const signer = await ethProvider.getSigner();
            const address = await signer.getAddress();
            const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

            setProvider(ethProvider);
            setUser(signer);
            setContract(gameContract);
            setUserAddress(address);
            setWalletType('farcaster');
            setManuallyDisconnected(false);
            
            // Restore Farcaster username from SDK context or localStorage
            try {
              let context = null;
              if (typeof sdk.context === 'function') {
                context = sdk.context();
              } else if (typeof sdk.context === 'object') {
                context = sdk.context;
              }
              
              if (context && context.user && context.user.username) {
                setFarcasterUsername(context.user.username);
                console.log(`✅ Restored Farcaster username from SDK: @${context.user.username}`);
                
                // Also store in localStorage for future use
                try {
                  localStorage.setItem('farcaster_user_data', JSON.stringify({
                    fid: context.user.fid || 0,
                    username: context.user.username
                  }));
                  console.log(`💾 Stored Farcaster user data in autoReconnectWallet: @${context.user.username}`);
                } catch (storageError) {
                  console.warn('⚠️ Failed to store Farcaster data:', storageError);
                }
              } else {
                // Fallback to localStorage
                const storedFarcasterData = localStorage.getItem('farcaster_user_data');
                console.log('🔍 Checking localStorage for Farcaster data:', storedFarcasterData);
                if (storedFarcasterData) {
                  const farcasterData = JSON.parse(storedFarcasterData);
                  console.log('📂 Parsed Farcaster data from localStorage:', farcasterData);
                  if (farcasterData.username) {
                    setFarcasterUsername(farcasterData.username);
                    console.log(`✅ Restored Farcaster username from localStorage: @${farcasterData.username}`);
                  }
                } else {
                  console.log('ℹ️ No Farcaster username found in SDK context or localStorage');
                  
                  // Try to fetch username via our API using wallet address as fallback
                  if (address) {
                    console.log('🔍 Attempting to fetch Farcaster username via API for address:', address);
                    try {
                      const response = await fetch(`/api/get-farcaster-username?address=${address}`);
                      if (response.ok) {
                        const data = await response.json();
                        if (data.username) {
                          setFarcasterUsername(data.username);
                          console.log(`✅ Fetched Farcaster username via API: @${data.username}`);
                          
                          // Store for future use
                          localStorage.setItem('farcaster_user_data', JSON.stringify({
                            fid: data.fid || 0,
                            username: data.username
                          }));
                        }
                      }
                    } catch (apiError) {
                      console.log('ℹ️ Failed to fetch username via API:', apiError.message);
                    }
                  }
                }
              }
            } catch (error) {
              console.warn('⚠️ Failed to restore Farcaster username:', error);
            }
            
            // After successful reconnection, check for pending bet
            await checkForPendingBet();
            
            // If no pending bet found, go to game selection
            if (gameState === 'loading') {
              setGameState('selecting');
            }
            
            console.log('✅ Farcaster wallet auto-reconnection successful');
            return;
          }
        }
      } catch (error) {
        console.log('ℹ️ Farcaster wallet not available:', error.message);
      }
      
      // Second priority: Check MetaMask/External wallet
      if (typeof window !== 'undefined' && window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
          console.log('✅ Found connected external wallet (MetaMask), restoring session...');
          
          // Check if we're on Base Network before proceeding
          try {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            if (chainId !== '0x2105') { // Base Network Chain ID
              console.log('⚠️ Wallet not on Base Network, will show network warning');
              setGameState('disconnected');
              return;
            }
          } catch (networkError) {
            console.warn('⚠️ Could not verify network, proceeding anyway:', networkError);
          }
          
          // Restore wallet connection
          const ethProvider = new ethers.BrowserProvider(window.ethereum);
          const signer = await ethProvider.getSigner();
          const address = await signer.getAddress();
          const gameContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

          setProvider(ethProvider);
          setUser(signer);
          setContract(gameContract);
          setUserAddress(address);
          setWalletType('external');
          setManuallyDisconnected(false);
          
          // Try to restore Farcaster username from localStorage (for mixed usage)
          try {
            const storedFarcasterData = localStorage.getItem('farcaster_user_data');
            if (storedFarcasterData) {
              const farcasterData = JSON.parse(storedFarcasterData);
              if (farcasterData.username) {
                setFarcasterUsername(farcasterData.username);
                console.log(`✅ Restored Farcaster username: @${farcasterData.username}`);
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to restore Farcaster username:', error);
          }
          
          // After successful reconnection, check for pending bet
          await checkForPendingBet();
          
          // If no pending bet found, go to game selection
          if (gameState === 'loading') {
            setGameState('selecting');
          }
          
          console.log('✅ External wallet auto-reconnection successful');
          return;
        }
      }
      
      console.log('ℹ️ No connected wallet found, showing disconnect state');
      setGameState('disconnected');
      
    } catch (error) {
      console.error('❌ Auto-reconnection failed:', error);
      setGameState('disconnected');
    }
  }
  
  async function checkForPendingBet() {
    try {
      const raw = localStorage.getItem('cd_currentWaiting');
      if (raw) {
        const pendingBet = JSON.parse(raw);
        console.log('🔍 Found pending bet:', pendingBet);
        
        // Only show if it's for the current contract and recent (within 1 hour)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        if (pendingBet.contractAddress === CONTRACT_ADDRESS && pendingBet.timestamp > oneHourAgo) {
          console.log('🔍 Verifying if bet is still valid on blockchain...');
          
          // Verify the bet is still waiting on blockchain before restoring
          const isStillWaiting = await verifyBetStillWaiting(pendingBet);
          if (isStillWaiting) {
            console.log('✅ Bet verified on blockchain, restoring waiting state');
            
            // Restore the bet selection
            setSelectedMode(pendingBet.mode);
            const matchingBet = betAmounts.find(bet => bet.value === pendingBet.betAmount);
            if (matchingBet) {
              setSelectedBet(matchingBet);
            }
            
            setGameState('waiting');
            console.log(`⏳ Restored waiting state for tx: ${pendingBet.txHash}`);
          } else {
            console.log('⚠️ Bet no longer waiting on blockchain, clearing localStorage');
            localStorage.removeItem('cd_currentWaiting');
          }
        } else {
          console.log('⚠️ Pending bet expired or for different contract, clearing...');
          localStorage.removeItem('cd_currentWaiting');
        }
      }
    } catch (error) {
      console.warn('Failed to check for pending bet:', error);
      localStorage.removeItem('cd_currentWaiting');
    }
  }

  async function verifyBetStillWaiting(pendingBet) {
    try {
      // Use stable RPC endpoints for verification
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com',
        'https://mainnet.base.org'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for bet verification: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed for verification:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for bet verification');
        return false; // If can't verify, assume bet is no longer valid
      }
      
      // Check if there are still waiting players for this mode/bet combination
      const waitingCount = await readOnlyContract.getWaitingPlayersCount(pendingBet.mode, pendingBet.betAmount);
      console.log(`🔍 Waiting count for mode ${pendingBet.mode}, bet ${ethers.formatEther(pendingBet.betAmount)}: ${Number(waitingCount)}`);
      
      // If there are no waiting players, the bet is no longer waiting
      return Number(waitingCount) > 0;
    } catch (error) {
      console.error('❌ Error verifying bet status:', error);
      return false; // If verification fails, assume bet is no longer valid
    }
  }

  useEffect(() => {
    if (contract && userAddress) {
      updateWaitingCounts();
      loadUserStats();
      checkAdminStatus();
      
      // Start checking for game results if in waiting state
      if (gameState === 'waiting') {
        checkForGameResult();
      }
    }
  }, [contract, userAddress, gameState]);

  // Check for game result every 10 seconds when in waiting state
  useEffect(() => {
    if (gameState === 'waiting' && userAddress) {
      const interval = setInterval(() => {
        checkForGameResult();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, [gameState, userAddress]);
  
  async function checkGameResult() {
    try {
      const raw = localStorage.getItem('cd_currentWaiting');
      if (!raw) return;
      
      const pendingBet = JSON.parse(raw);
      console.log('🔍 Starting game result monitoring for pending bet...');
      
      // Check every 5 seconds for game result
      const intervalId = setInterval(async () => {
        try {
          console.log('⏰ Checking game status...');
          
          // If we're no longer in waiting state due to external actions, clear the interval
          if (gameState !== 'waiting') {
            console.log('🛑 No longer in waiting state, stopping monitoring');
            clearInterval(intervalId);
            return;
          }
          
          // Check if bet is still waiting on blockchain
          const isStillWaiting = await verifyBetStillWaiting(pendingBet);
          if (!isStillWaiting) {
            console.log('🎉 Game completed or cancelled, clearing localStorage');
            localStorage.removeItem('cd_currentWaiting');
            
            // Update waiting counts and stats
            await updateWaitingCounts();
            await loadUserStats();
            
            // Return to selecting state
            setGameState('selecting');
            clearInterval(intervalId);
            return;
          }
          
          console.log('⌛ Still waiting for opponent...');
          
        } catch (error) {
          console.warn('⚠️ Error checking game result:', error);
        }
      }, 5000);
      
      // Clear interval after 10 minutes (game should start or we should cancel)
      setTimeout(() => {
        console.log('⏰ Game result monitoring timeout after 10 minutes');
        clearInterval(intervalId);
      }, 10 * 60 * 1000);
      
    } catch (error) {
      console.error('❌ Error setting up game result check:', error);
    }
  }

  async function connectFarcasterWallet() {
    console.log('🎯 === FARCASTER WALLET CONNECTION DEBUG START ===');
    
    try {
      console.log('📱 Step 1: Checking Farcaster context...');
      console.log(`🌍 Environment: ${typeof window !== 'undefined' ? 'Browser' : 'Server'}`);
      console.log(`🔗 URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`);
      console.log(`📱 Is in iframe: ${typeof window !== 'undefined' && window.parent !== window}`);
      console.log(`🎯 Window parent exists: ${typeof window !== 'undefined' && !!window.parent}`);
      
      console.log('📦 Step 2: Importing Farcaster SDK...');
      const { sdk } = await import('@farcaster/miniapp-sdk');
      console.log(`✅ SDK imported successfully: ${!!sdk}`);
      console.log(`🔧 SDK.wallet available: ${!!sdk.wallet}`);
      console.log(`🔧 SDK.context available: ${!!sdk.context}`);
      console.log(`🔧 SDK.actions available: ${!!sdk.actions}`);
      
      if (!sdk.wallet) {
        console.error('❌ SDK wallet is not available!');
        console.log('🔍 Checking if we are in Farcaster context...');
        
        // Check if we're in Farcaster context
        const isInIframe = typeof window !== 'undefined' && window.parent !== window;
        const hasFarcasterReferrer = typeof document !== 'undefined' && 
          (document.referrer.includes('farcaster.xyz') || 
           document.referrer.includes('warpcast.com') ||
           document.referrer.includes('client.warpcast.com'));
        
        console.log(`🔍 iframe: ${isInIframe}, farcaster-referrer: ${hasFarcasterReferrer}`);
        console.log(`🔍 document.referrer: ${typeof document !== 'undefined' ? document.referrer : 'N/A'}`);
        
        throw new Error(`Farcaster wallet not available. Context: iframe=${isInIframe}, referrer=${hasFarcasterReferrer ? 'farcaster' : 'other'}`);
      }
      
      console.log('🔄 Step 3: Getting Farcaster wallet provider...');
      console.log('🔧 Available wallet methods:', Object.keys(sdk.wallet || {}));
      
      // Try different provider methods based on capabilities
      let prov = null;
      try {
        if (sdk.wallet.getEthereumProvider) {
          console.log('🔄 Trying getEthereumProvider...');
          prov = await sdk.wallet.getEthereumProvider();
        } else if (sdk.wallet.getEvmProvider) {
          console.log('🔄 Trying getEvmProvider...');
          prov = await sdk.wallet.getEvmProvider();
        } else if (sdk.wallet.ethProvider) {
          console.log('🔄 Trying ethProvider...');
          prov = await sdk.wallet.ethProvider();
        } else {
          console.error('❌ No wallet provider method found!');
          console.log('🔧 Available methods:', Object.keys(sdk.wallet));
        }
      } catch (providerError) {
        console.error('❌ Provider method error:', providerError);
        console.log('🔄 Trying alternative provider methods...');
        
        // Try alternative methods
        if (sdk.wallet.getEvmProvider && !prov) {
          try {
            console.log('🔄 Fallback: Trying getEvmProvider...');
            prov = await sdk.wallet.getEvmProvider();
          } catch {}
        }
        
        if (sdk.wallet.getEthereumProvider && !prov) {
          try {
            console.log('🔄 Fallback: Trying getEthereumProvider...');
            prov = await sdk.wallet.getEthereumProvider();
          } catch {}
        }
      }
      
      console.log(`✅ Provider received: ${!!prov}`);
      console.log(`🔧 Provider type: ${typeof prov}`);
      
      if (!prov) {
        console.error('❌ Could not get Farcaster wallet provider!');
        console.log('🔍 Checking wallet capabilities...');
        if (sdk.wallet.capabilities) {
          console.log(`🔧 Wallet capabilities: ${JSON.stringify(sdk.wallet.capabilities)}`);
        }
        throw new Error('Could not get Farcaster wallet provider');
      }

      console.log('🔄 Step 4: Creating ethers provider and signer...');
      const walletProvider = new ethers.BrowserProvider(prov);
      console.log('✅ BrowserProvider created');
      
      const signer = await walletProvider.getSigner();
      console.log('✅ Signer obtained');
      
      const address = await signer.getAddress();
      console.log(`✅ Address obtained: ${address}`);
      
      console.log('🔄 Step 5: Creating contract instance...');
      const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      console.log('✅ Contract instance created');

      console.log('🔄 Step 6: Getting Farcaster user context...');
      let farcasterUser = null;
      try {
        // Try to get from SDK context first
        if (sdk.context) {
          let context;
          if (typeof sdk.context === 'function') {
            context = sdk.context();
          } else if (typeof sdk.context === 'object') {
            context = sdk.context;
          }
          
          if (context && context.user && context.user.username) {
            farcasterUser = context.user.username;
            console.log(`✅ Farcaster username obtained from SDK: @${farcasterUser}`);
          }
        }
        
        // If SDK context doesn't work, try localStorage (set by FarcasterInit)
        if (!farcasterUser && typeof window !== 'undefined') {
          const storedFarcasterData = localStorage.getItem('farcaster_user_data');
          if (storedFarcasterData) {
            const userData = JSON.parse(storedFarcasterData);
            if (userData.username) {
              farcasterUser = userData.username;
              console.log(`✅ Farcaster username obtained from localStorage: @${farcasterUser}`);
            }
          }
        }
        
        // If still no username, try to get it from Farcaster API by wallet address
        if (!farcasterUser) {
          try {
            console.log('🔍 Trying to get username from Farcaster API by wallet address...');
            const farcasterApiResponse = await fetch(`/api/get-farcaster-username?address=${address}`);
            if (farcasterApiResponse.ok) {
              const data = await farcasterApiResponse.json();
              if (data.username) {
                farcasterUser = data.username;
                console.log(`✅ Farcaster username obtained from API: @${farcasterUser}`);
              }
            }
          } catch (error) {
            console.warn('⚠️ Could not get username from API:', error.message);
          }
        }
        
        if (!farcasterUser) {
          console.log('ℹ️ No Farcaster username available from SDK or localStorage');
        }
      } catch (error) {
        console.warn('⚠️ Could not get Farcaster context:', error.message);
      }

      console.log('🔄 Step 7: Setting state...');
      setManuallyDisconnected(false);
      setProvider(walletProvider);
      setContract(contractInstance);
      setUserAddress(address);
      setWalletType('farcaster');
      setFarcasterUsername(farcasterUser);
      setGameState('selecting');
      
      console.log('✅ === FARCASTER WALLET CONNECTION SUCCESS ===');
    } catch (error) {
      console.error('❌ === FARCASTER WALLET CONNECTION FAILED ===');
      console.error(`❌ Error: ${error.message}`);
      console.error(`❌ Stack: ${error.stack}`);
      
      // More detailed error analysis
      console.log('🔍 === DETAILED ERROR ANALYSIS ===');
      console.log(`🔍 Error name: ${error.name}`);
      console.log(`🔍 Error constructor: ${error.constructor.name}`);
      
      throw error;
    }
  }

  async function connectExternalWallet() {
    if (!window.ethereum) throw new Error('No wallet found. Please install MetaMask or another wallet.');
    
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    
    // Check and switch to Base Network (Chain ID: 8453)
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('🔗 Current chain ID:', chainId);
      
      if (chainId !== '0x2105') { // 8453 in hex = 0x2105
        console.log('🔄 Switching to Base Network...');
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x2105' }],
          });
        } catch (switchError) {
          // If Base Network is not added, add it
          if (switchError.code === 4902) {
            console.log('📡 Adding Base Network...');
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x2105',
                chainName: 'Base',
                nativeCurrency: {
                  name: 'Ethereum',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://mainnet.base.org'],
                blockExplorerUrls: ['https://basescan.org'],
              }],
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (networkError) {
      console.error('❌ Network switch failed:', networkError);
      throw new Error('Please switch to Base Network to use this app. Network ID should be 8453.');
    }
    
    const walletProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await walletProvider.getSigner();
    const address = await signer.getAddress();
    const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    setManuallyDisconnected(false);
    setProvider(walletProvider);
    setContract(contractInstance);
    setUserAddress(address);
    setWalletType('external');
    setFarcasterUsername(null); // Clear Farcaster username for external wallet
    setGameState('selecting');
  }

  async function updateWaitingCounts() {
    if (!userAddress) return;
    console.log('🔄 Updating waiting counts...');
    
    const counts = {};
    
    // Always use RPC provider for read-only operations (Farcaster Wallet doesn't support eth_call)
    try {
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com',
        'https://mainnet.base.org'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for read operations: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for read operations');
        return;
      }
      
      // Get waiting counts for all modes and bet amounts
      for (const mode of gameModes) {
        counts[mode.id] = {};
        for (const bet of betAmounts) {
          try {
            const count = await readOnlyContract.getWaitingPlayersCount(mode.id, bet.value);
            counts[mode.id][bet.value] = Number(count);
          } catch {
            counts[mode.id][bet.value] = 0;
          }
        }
      }
      
      console.log('✅ Waiting counts loaded via RPC:', counts);
      setWaitingCount(counts);
    } catch (error) {
      console.error('❌ Error updating waiting counts:', error);
    }
  }

  async function checkForGameResult() {
    if (!userAddress || gameState !== 'waiting') return;
    
    console.log('🔍 Checking for game result...');
    
    // Check localStorage for current waiting game
    const currentWaiting = localStorage.getItem('cd_currentWaiting');
    if (!currentWaiting) return;
    
    try {
      const waitingData = JSON.parse(currentWaiting);
      const { mode, betAmount } = waitingData;
      
      // Use RPC provider for checking results
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://mainnet.base.org',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          await rpcProvider.getBlockNumber();
          break;
        } catch {
          continue;
        }
      }
      
      if (!readOnlyContract) return;
      
      // Check if we're still in waiting list
      const waitingCount = await readOnlyContract.getWaitingPlayersCount(mode, betAmount);
      
      // If no one is waiting, game might have completed
      if (Number(waitingCount) === 0) {
        console.log('🎉 Game appears to have completed! Checking results...');
        
        // Check for recent games involving this user
        if (mode === 0) { // Duel
          const totalDuels = await readOnlyContract.totalDuels();
          // Check last few duels for our result
          for (let i = Math.max(0, Number(totalDuels) - 10); i < Number(totalDuels); i++) {
            try {
              const duel = await readOnlyContract.getDuel(i);
              const player1 = duel[0]?.toLowerCase();
              const player2 = duel[1]?.toLowerCase();
              const completed = duel[3];
              const winner = duel[4]?.toLowerCase();
              
              if (completed && (player1 === userAddress.toLowerCase() || player2 === userAddress.toLowerCase())) {
                const won = winner === userAddress.toLowerCase();
                const prize = ethers.formatEther(duel[2]) * 1.8;
                
                setGameResult({
                  type: 'duel',
                  won,
                  prize: won ? prize : 0,
                  mode: 'Duel',
                  duelId: i
                });
                
                setGameState('result');
                localStorage.removeItem('cd_currentWaiting');
                return;
              }
            } catch (error) {
              console.warn(`Could not check duel ${i}:`, error.message);
            }
          }
        } else { // Battle Royale
          const totalBR = await readOnlyContract.totalBattleRoyales();
          // Check last few Battle Royales
          for (let i = Math.max(0, Number(totalBR) - 5); i < Number(totalBR); i++) {
            try {
              const br = await readOnlyContract.getBattleRoyale(i);
              const players = br.players.map(p => p.toLowerCase());
              const completed = br.completed;
              const winner = br.winner?.toLowerCase();
              
              if (completed && players.includes(userAddress.toLowerCase())) {
                const won = winner === userAddress.toLowerCase();
                const multiplier = { 1: 4.5, 2: 90, 3: 900 }[mode] || 1;
                const prize = won ? ethers.formatEther(br.betAmount) * multiplier : 0;
                
                setGameResult({
                  type: 'battle_royale',
                  won,
                  prize,
                  mode: { 1: 'Battle Royale 5', 2: 'Battle Royale 100', 3: 'Battle Royale 1000' }[mode],
                  battleId: i,
                  playersCount: players.length
                });
                
                setGameState('result');
                localStorage.removeItem('cd_currentWaiting');
                return;
              }
            } catch (error) {
              console.warn(`Could not check battle royale ${i}:`, error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking game result:', error);
    }
  }

  async function loadUserStats() {
    if (!userAddress) return;
    console.log('🔄 Loading user stats...');
    
    // Always use RPC provider for read-only operations (Farcaster Wallet doesn't support eth_call)
    try {
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://mainnet.base.org',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for user stats: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for user stats');
        return;
      }
      
      const [totalGames, wins, totalWinnings] = await readOnlyContract.getPlayerStats(userAddress);
      setUserStats({
        totalGames: Number(totalGames),
        wins: Number(wins),
        totalWinnings: ethers.formatEther(totalWinnings)
      });
      console.log('✅ User stats loaded via RPC');
    } catch (error) {
      console.error('❌ Error loading user stats:', error);
    }
  }

  async function checkAdminStatus() {
    if (!userAddress) return;
    console.log('🔄 Checking admin status...');
    
    // Always use RPC provider for read-only operations (Farcaster Wallet doesn't support eth_call)
    try {
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://mainnet.base.org',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for admin check: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for admin check');
        return;
      }
      
      const owner = await readOnlyContract.owner();
      const isOwner = userAddress.toLowerCase() === owner.toLowerCase();
      setIsAdmin(isOwner);
      if (isOwner) {
        console.log('🔥 User is admin! Loading admin analytics...');
        await loadAdminAnalytics();
      }
      console.log('✅ Admin status checked via RPC');
    } catch (error) {
      console.error('❌ Error checking admin status:', error);
    }
  }

  async function loadAdminAnalytics() {
    console.log('🔄 Loading admin analytics...');
    
    // Always use RPC provider for read-only operations (Farcaster Wallet doesn't support eth_call)
    try {
      const RPC_ENDPOINTS = [
        'https://base-mainnet.public.blastapi.io',
        'https://mainnet.base.org',
        'https://base.gateway.tenderly.co',
        'https://base-rpc.publicnode.com'
      ];
      
      let readOnlyContract = null;
      for (const rpcUrl of RPC_ENDPOINTS) {
        try {
          const rpcProvider = new ethers.JsonRpcProvider(rpcUrl);
          readOnlyContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, rpcProvider);
          // Test the connection
          await rpcProvider.getBlockNumber();
          console.log(`✅ Using RPC for admin analytics: ${rpcUrl}`);
          break;
        } catch (error) {
          console.warn(`❌ RPC ${rpcUrl} failed:`, error.message);
          continue;
        }
      }
      
      if (!readOnlyContract) {
        console.error('❌ All RPC endpoints failed for admin analytics');
        return;
      }
      
      const totalDuels = await readOnlyContract.totalDuels();
      const totalBattleRoyales = await readOnlyContract.totalBattleRoyales();
      
      const analytics = {
        totalGames: Number(totalDuels) + Number(totalBattleRoyales),
        totalVolume: 0n, // BigInt
        totalCommissions: 0n, // BigInt
        gamesByBet: {},
        gamesByMode: {
          duels: 0,
          br5: 0,
          br100: 0,
          br1000: 0
        },
        completedGamesCount: 0
      };

      betAmounts.forEach(bet => {
        analytics.gamesByBet[bet.value] = { count: 0, volume: 0n, label: bet.label }; // BigInt
      });

      // Load Duels
      const maxDuels = Math.min(Number(totalDuels), 1000);
      
      for (let i = 1; i <= maxDuels; i++) {
        try {
          const duel = await readOnlyContract.getDuel(i);
          
          // Skip if duel doesn't exist (empty data)
          if (!duel.player1 || duel.player1 === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          if (duel.completed) {
            const betAmount = duel.betAmount.toString();
            const totalPool = duel.betAmount * 2n; // BigInt арифметика
            const commission = (totalPool * 10n) / 100n; // 10% комісії в BigInt

            analytics.totalVolume += totalPool;
            analytics.totalCommissions += commission;
            analytics.completedGamesCount++;
            analytics.gamesByMode.duels++;

            if (analytics.gamesByBet[betAmount]) {
              analytics.gamesByBet[betAmount].count++;
              analytics.gamesByBet[betAmount].volume += totalPool;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Load Battle Royales
      const maxBattleRoyales = Math.min(Number(totalBattleRoyales), 1000);
      
      for (let i = 1; i <= maxBattleRoyales; i++) {
        try {
          const battleRoyale = await readOnlyContract.getBattleRoyale(i);
          
          // Skip if battle royale doesn't exist
          if (!battleRoyale.id || Number(battleRoyale.id) === 0) {
            continue;
          }
          
          if (battleRoyale.completed) {
            const betAmount = battleRoyale.betAmount.toString();
            const totalPool = battleRoyale.betAmount * BigInt(battleRoyale.players.length);
            const commission = (totalPool * 10n) / 100n; // 10% комісії в BigInt

            analytics.totalVolume += totalPool;
            analytics.totalCommissions += commission;
            analytics.completedGamesCount++;

            // Count by mode: 1=BR5, 2=BR100, 3=BR1000
            if (Number(battleRoyale.mode) === 1) analytics.gamesByMode.br5++;
            else if (Number(battleRoyale.mode) === 2) analytics.gamesByMode.br100++;
            else if (Number(battleRoyale.mode) === 3) analytics.gamesByMode.br1000++;

            if (analytics.gamesByBet[betAmount]) {
              analytics.gamesByBet[betAmount].count++;
              analytics.gamesByBet[betAmount].volume += totalPool;
            }
          }
        } catch (error) {
          continue;
        }
      }

      // Конвертуємо BigInt в рядки для ethers.formatEther
      const gamesByBetFormatted = {};
      Object.keys(analytics.gamesByBet).forEach(key => {
        gamesByBetFormatted[key] = {
          ...analytics.gamesByBet[key],
          volume: analytics.gamesByBet[key].volume.toString() // BigInt to string
        };
      });

      setAdminAnalytics({
        totalGames: analytics.totalGames,
        totalVolume: ethers.formatEther(analytics.totalVolume.toString()),
        totalCommissions: ethers.formatEther(analytics.totalCommissions.toString()),
        gamesByBet: gamesByBetFormatted,
        gamesByMode: analytics.gamesByMode,
        averageBet: analytics.completedGamesCount > 0
          ? ethers.formatEther((analytics.totalVolume / BigInt(analytics.completedGamesCount)).toString())
          : '0',
        mostPopularBet: Object.values(analytics.gamesByBet).reduce((acc, v) => v.count > (acc.count || 0) ? v : acc, {}).label || 'None'
      });
      
    } catch (error) {
      console.error('❌ Failed to load admin analytics:', error);
      
      // Set default analytics even if loading fails
      const defaultAnalytics = {
        totalGames: 0,
        totalVolume: '0',
        totalCommissions: '0',
        gamesByBet: {},
        gamesByMode: { duels: 0, br5: 0, br100: 0, br1000: 0 },
        averageBet: '0',
        mostPopularBet: 'None'
      };
      
      betAmounts.forEach(bet => {
        defaultAnalytics.gamesByBet[bet.value] = { count: 0, volume: 0, label: bet.label };
      });
      
      setAdminAnalytics(defaultAnalytics);
      console.log('📊 Set default admin analytics due to error');
    }
  }

  function selectBet(betValue, betEth) {
    setSelectedBet({ value: betValue, eth: betEth });
    setGameState('confirming');
  }

  async function confirmAndJoinGame() {
    if (!contract || !selectedBet) return;
    
    try {
      setGameState('transaction_sent');
      console.log('🔄 Sending joinGame transaction...');
      
      // Dynamic gas limit based on wallet type and game mode
      let gasLimit;
      if (walletType === 'farcaster') {
        // Farcaster Wallet gas limits (doesn't support eth_estimateGas)
        gasLimit = selectedMode === 0 ? 350000 : 500000; // Duel: 350k, Battle Royale: 500k
      } else {
        // External wallets gas limits for Base Network (estimated: Duel ~157k, BR ~410k)
        gasLimit = selectedMode === 0 ? 350000 : 500000; // Duel: 350k, Battle Royale: 500k
      }
      console.log(`⛽ Using ${walletType} wallet gas limit for mode ${selectedMode}: ${gasLimit}`);
      
      const tx = await contract.joinGame(selectedMode, { 
        value: selectedBet.value,
        gasLimit: gasLimit
      });
      
      // Save current waiting info to localStorage
      localStorage.setItem('cd_currentWaiting', JSON.stringify({
        txHash: tx.hash,
        mode: selectedMode,
        betAmount: selectedBet.value,
        betEth: selectedBet.eth,
        timestamp: Date.now(),
        contractAddress: CONTRACT_ADDRESS
      }));

      console.log('✅ Transaction sent successfully!', tx.hash);
      setGameState('waiting'); // Now move to waiting state
      
      // Handle confirmation differently for Farcaster wallet
      if (walletType === 'farcaster') {
        console.log('📱 Farcaster wallet detected - skipping tx.wait() due to eth_getTransactionReceipt limitation');
        // Just update counts without waiting for receipt
        setTimeout(() => {
          updateWaitingCounts();
        }, 3000); // Give blockchain time to process
      } else {
        // Wait for transaction and result for external wallets
        try {
          await tx.wait();
          updateWaitingCounts();
        } catch (waitError) {
          console.log('⚠️ tx.wait() failed, but transaction was likely successful:', waitError.message);
          // Still update counts since transaction was submitted
          setTimeout(() => {
            updateWaitingCounts();
          }, 3000);
        }
      }
      
    } catch (error) {
      console.error('Error joining game:', error);
      
      // Handle specific JSON-RPC errors
      if (error.code === -32603 || error.message.includes('transaction hash')) {
        alert('Network error: Transaction was rejected by the network. This can happen due to:\n\n• Network congestion - please try again in a few minutes\n• Insufficient ETH for gas fees - make sure you have enough ETH\n• Game state changed - another player may have joined\n\nPlease try again or refresh the page.');
      } else if (error.code === 4001) {
        alert('Transaction cancelled by user');
      } else {
        alert('Error joining game: ' + error.message);
      }
      
      setGameState('confirming');
    }
  }

  function getMultiplierForMode(mode) {
    const modeInfo = gameModes.find(m => m.id === mode);
    return modeInfo ? modeInfo.multiplier : '1.8x';
  }

  function getPlayersForMode(mode) {
    const modeInfo = gameModes.find(m => m.id === mode);
    return modeInfo ? modeInfo.players : 2;
  }

  async function cancelWaitingBet() {
    if (!contract) return;
    
    try {
      console.log('🔄 Cancelling waiting bet...');
      
      // Dynamic gas limit based on wallet type for cancelWaiting
      let gasLimit;
      if (walletType === 'farcaster') {
        gasLimit = 150000; // Farcaster Wallet gas limit for cancel
      } else {
        gasLimit = 60000; // External wallets optimized gas limit for Base Network cancel
      }
      console.log(`⛽ Using ${walletType} wallet cancel gas limit: ${gasLimit}`);
      
      const tx = await contract.cancelWaiting({ gasLimit: gasLimit });
      
      console.log('🔄 Cancel transaction submitted:', tx.hash);
      
      // Clear localStorage immediately
      localStorage.removeItem('cd_currentWaiting');
      
      // Reset to selecting state
      setGameState('selecting');
      
      // Handle confirmation differently for Farcaster wallet
      if (walletType === 'farcaster') {
        console.log('📱 Farcaster wallet detected - skipping tx.wait() due to eth_getTransactionReceipt limitation');
        console.log('✅ Cancel transaction submitted successfully!');
        // Update counts after delay
        setTimeout(() => {
          updateWaitingCounts();
        }, 3000);
      } else {
        // Wait for transaction to complete for external wallets
        try {
          await tx.wait();
          console.log('✅ Cancel confirmed!');
          // Update waiting counts
          updateWaitingCounts();
        } catch (waitError) {
          console.log('⚠️ tx.wait() failed, but cancel was likely successful:', waitError.message);
          // Still update counts since transaction was submitted
          setTimeout(() => {
            updateWaitingCounts();
          }, 3000);
        }
      }
      
    } catch (error) {
      console.error('❌ Cancel failed:', error);
      alert('Cancel failed: ' + error.message);
    }
  }

  function disconnectWallet() {
    setManuallyDisconnected(true);
    setProvider(null);
    setContract(null);
    setUserAddress(null);
    setWalletType(null);
    setFarcasterUsername(null);
    setUser(null);
    setGameState('disconnected');
    setUserStats({ totalGames: 0, wins: 0, totalWinnings: 0 });
    setWaitingCount({});
    setLastResult(null);
    setIsAdmin(false);
    setAdminAnalytics({
      totalGames: 0,
      totalVolume: '0',
      totalCommissions: '0',
      gamesByBet: {},
      gamesByMode: { duels: 0, br5: 0, br100: 0, br1000: 0 },
      averageBet: '0',
      mostPopularBet: 'None'
    });
    
    // Clear any pending waiting bets and Farcaster data from localStorage
    localStorage.removeItem('cd_currentWaiting');
    localStorage.removeItem('farcaster_user_data');
    console.log('🧹 Cleared pending waiting bet and Farcaster data on disconnect');
  }

  return (
    <>
      <Head>
        <title>Crypto Duel - Play & Win ETH | Duels & Battle Royale</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon2.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: `${baseUrl}/image.png`,
          button: { title: "🎮 Play Games", action: { type: "launch_miniapp", name: "Crypto Duel", url: `${baseUrl}/app`, splashImageUrl: `${baseUrl}/splash.png`, splashBackgroundColor: "#8B5CF6" } }
        })} />
        <meta property="og:image" content={`${baseUrl}/image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${baseUrl}/image.png`} />
      </Head>

      <FarcasterInit />
      <FarcasterAppDialog />

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto p-4">

          {/* Header */}
          <div className="text-center mb-6">
            {/* Logo and title in same row */}
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/icon2.png" alt="Crypto Duel" className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Crypto Duel</h1>
            </div>
            <div className="text-xs text-gray-400 font-mono">
              Contract: {CONTRACT_ADDRESS.slice(0, 6)}...{CONTRACT_ADDRESS.slice(-4)}
            </div>

            <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
              <Link href="/how-it-works" className="text-sm text-purple-200 hover:text-purple-100 flex items-center gap-1">
                <Info size={14} /> How It Works
              </Link>
              <span className="opacity-40">•</span>
              <Link href="/leaderboard" className="text-sm text-purple-200 hover:text-purple-100 flex items-center gap-1">
                <Users size={14} /> Leaderboard
              </Link>
              <span className="opacity-40">•</span>
              <Link href="/user" className="text-sm text-purple-200 hover:text-purple-100 flex items-center gap-1">
                <Wallet size={14} /> My Games
              </Link>
            </div>

            {userAddress && (
              <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-gray-400 mb-1">Connected Wallet:</p>
                <p className="text-sm font-mono text-green-400 break-all mb-2">
                  {userAddress}
                  {farcasterUsername && <span className="text-purple-300 ml-1">(@{farcasterUsername})</span>}
                </p>
                <div className="flex justify-center">
                  <button
                    onClick={disconnectWallet}
                    className="bg-red-500/80 hover:bg-red-500 px-3 py-2 rounded-lg text-xs text-white transition-all duration-200 hover:scale-105 flex items-center gap-1"
                  >
                    <ExternalLink size={12} /> Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Stats */}
          {userStats.totalGames > 0 && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20 shadow-xl">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><div className="text-xl font-bold text-blue-400">{userStats.totalGames}</div><div className="text-xs text-gray-400">Games</div></div>
                <div><div className="text-xl font-bold text-green-400">{userStats.wins}</div><div className="text-xs text-gray-400">Wins</div></div>
                <div><div className="text-xl font-bold text-red-400">{userStats.totalGames - userStats.wins}</div><div className="text-xs text-gray-400">Losses</div></div>
                <div>
                  <EthWithUsd 
                    amount={userStats.totalWinnings} 
                    decimals={5} 
                    vertical={true}
                    className="text-lg font-bold text-yellow-400"
                    usdClassName="text-xs text-gray-400"
                  />
                  <div className="text-xs text-gray-400 mt-1">Won</div>
                </div>
              </div>
            </div>
          )}

          {/* Connect Wallet */}
          {gameState === 'disconnected' && (
            <div className="text-center py-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <h2 className="text-xl font-semibold mb-4">Choose Wallet Type</h2>
                <p className="text-gray-300 mb-6">Select how you want to connect your wallet</p>
                <div className="space-y-4">
                  <button onClick={() => connectFarcasterWallet().catch(e => alert(e.message))}
                          style={{backgroundColor: '#815CC3'}} 
                          className="w-full hover:opacity-90 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 shadow-lg">
                    <img src="/farcaster.png" alt="Farcaster" className="w-6 h-6" />
                    <div className="text-left">
                      <div className="font-semibold">Farcaster Wallet</div>
                      <div className="text-sm text-purple-200">Use built-in Farcaster wallet</div>
                    </div>
                  </button>
                  <button onClick={() => connectExternalWallet().catch(e => alert(e.message))}
                          className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 shadow-lg">
                    <Wallet size={24} className="text-white" />
                    <div className="text-left">
                      <div className="font-semibold">External Wallet</div>
                      <div className="text-sm text-orange-200">MetaMask, Coinbase Wallet, etc.</div>
                    </div>
                  </button>
                  
                  {/* Base Network Information */}
                  <div className="bg-blue-500/20 border border-blue-400/30 rounded-xl p-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-300">Base Network Required</span>
                    </div>
                    <p className="text-xs text-gray-300">
                      🌐 Gas fees: ~$0.01 (100x cheaper than Ethereum)<br/>
                      ⚡ Fast transactions: ~2 seconds<br/>
                      🔧 External wallets will auto-switch to Base Network
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Game Mode Selection & Bet Selection */}
          {gameState === 'selecting' && (
            <div>
              {/* Share Section */}
              <div className="mb-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Share the game with friends:</div>
                <ShareButtons 
                  message="Try Crypto Duel! 🎮⚡️ Duels + Battle Royale modes. Ready for the challenge?"
                  className="justify-center"
                />
              </div>

              {/* Game Mode Tabs */}
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4 text-center">Choose Game Mode</h2>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {gameModes.map((mode) => {
                    const IconComponent = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={`p-3 rounded-xl border transition-all duration-300 hover:scale-105 backdrop-blur-sm ${
                          selectedMode === mode.id 
                            ? `bg-gradient-to-r ${mode.color} border-white/40 shadow-lg` 
                            : 'bg-white/10 border-white/20 hover:border-white/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <IconComponent size={20} className="text-white" />
                          <div className="font-semibold text-sm">{mode.name}</div>
                        </div>
                        <div className="text-xs text-gray-200">{mode.desc}</div>
                        <div className="text-xs text-yellow-300 mt-1">{mode.multiplier} win</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              
              {/* Bet Amount Selection */}
              <h3 className="text-lg font-semibold mb-3 text-center">Choose Your Bet</h3>
              <div className="space-y-3">
                {betAmounts.map((bet, idx) => {
                  const waitingForMode = waitingCount[selectedMode] && waitingCount[selectedMode][bet.value] ? waitingCount[selectedMode][bet.value] : 0;
                  const multiplier = getMultiplierForMode(selectedMode);
                  const multiplierNum = selectedMode === 0 ? 1.8 : 
                                      selectedMode === 1 ? 4.5 : 
                                      selectedMode === 2 ? 90 : 900;
                  
                  return (
                    <button key={idx} onClick={() => selectBet(bet.value, bet.eth)}
                            className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl border border-white/20 transition-all duration-300 hover:border-cyan-400 hover:scale-105 backdrop-blur-sm shadow-lg">
                      <div className="flex justify-between items-center">
                        <div className="text-left">
                          <div className="font-semibold text-white"><EthWithUsd amount={bet.eth} decimals={5} /></div>
                          <div className="text-sm text-gray-400">Waiting: {waitingForMode} players</div>
                        </div>
                        <div className="text-right">
                          <div className="text-green-400 font-semibold">Win: <EthWithUsd amount={bet.eth * multiplierNum} decimals={6} /></div>
                          <div className="text-sm text-yellow-400">{multiplier} multiplier</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 p-4 bg-cyan-400/10 rounded-xl border border-cyan-400/30 text-center text-sm text-cyan-200 backdrop-blur-sm">
                <strong>Fair Play:</strong> Winner determined by on-chain randomness
              </div>
            </div>
          )}

          {/* Confirmation State */}
          {gameState === 'confirming' && selectedBet && (
            <div className="text-center py-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="mb-6">
                  <div className="p-4 bg-cyan-400/10 rounded-full mx-auto w-fit mb-4 border border-cyan-400/30">
                    {React.createElement(gameModes[selectedMode].icon, { size: 48, className: "text-cyan-400" })}
                  </div>
                  <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Confirm Your {gameModes[selectedMode].name}
                  </h2>
                </div>
                
                <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">Game Mode:</div>
                  <div className="text-xl font-bold text-white mb-3">{gameModes[selectedMode].name} ({gameModes[selectedMode].players} players)</div>
                  
                  <div className="text-sm text-gray-400 mb-2">Bet Amount:</div>
                  <div className="text-2xl font-bold text-white mb-3">
                    <EthWithUsd amount={selectedBet.eth} decimals={5} />
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">Potential Win:</div>
                  <div className="text-xl font-bold text-green-400">
                    <EthWithUsd amount={selectedBet.eth * (selectedMode === 0 ? 1.8 : selectedMode === 1 ? 4.5 : selectedMode === 2 ? 90 : 900)} decimals={6} />
                  </div>
                  <div className="text-sm text-yellow-400 mt-1">{gameModes[selectedMode].multiplier} multiplier</div>
                </div>
                
                <div className="bg-cyan-400/10 rounded-xl p-4 mb-6 border border-cyan-400/30 text-center text-sm text-cyan-200">
                  <strong>Fair random selection!</strong> Winner determined by on-chain randomness
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={confirmAndJoinGame}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
                  >
                    {React.createElement(gameModes[selectedMode].icon, { size: 20, className: "text-white" })}
                    🎮 Join {gameModes[selectedMode].name}
                  </button>
                  
                  <button 
                    onClick={() => setGameState('selecting')}
                    className="w-full bg-gray-600/80 hover:bg-gray-600 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-2"
                  >
                    ⬅️ Back to Selection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Waiting State */}
          {/* Transaction Sent Confirmation */}
          {gameState === 'transaction_sent' && selectedBet && (
            <div className="text-center py-8">
              <div className="animate-pulse mb-6 flex justify-center">
                <div className="p-4 bg-green-500/20 rounded-full backdrop-blur-sm border border-green-400/30">
                  <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2 text-green-400">
                ✅ Transaction Sent Successfully!
              </h2>
              <p className="text-gray-300 mb-4">
                Your bet has been submitted to the blockchain.<br/>
                Moving you to the waiting room...
              </p>
              <div className="text-sm text-gray-400">
                Mode: {gameModes[selectedMode].name} | Bet: {selectedBet.eth} ETH
              </div>
            </div>
          )}

          {/* Waiting for Players */}
          {gameState === 'waiting' && selectedBet && (
            <div className="text-center py-8">
              <div className="animate-pulse-slow mb-6 flex justify-center">
                <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                  {React.createElement(gameModes[selectedMode].icon, { size: 48, className: "text-cyan-400" })}
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">
                Waiting for {gameModes[selectedMode].name === 'Duel' ? 'opponent' : `${gameModes[selectedMode].players - 1} more players`}...
              </h2>
              <p className="text-gray-300 mb-2">Mode: {gameModes[selectedMode].name} | Bet: {selectedBet.eth} ETH</p>
              <p className="text-gray-400 mb-5">
                You can come back later and check the result in{' '}
                <Link href="/user" className="underline text-purple-200 hover:text-purple-100">"My Games"</Link>.
              </p>
              
              <div className="mb-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Share with friends to fill the game faster:</div>
                <ShareButtons 
                  message={`I'm waiting for ${gameModes[selectedMode].players - 1} more players in ${gameModes[selectedMode].name} mode! 🔥⚔️ Join me for ETH battles!`}
                  className="justify-center"
                />
              </div>

              <div className="flex flex-col gap-3 items-center">
                <Link href="/user" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  👤 Go to My Games
                </Link>
                <button onClick={cancelWaitingBet} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  ❌ Cancel Waiting
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('cd_currentWaiting');
                    setGameState('selecting');
                    console.log('🔄 Refresh & Back to Menu: localStorage cleared, returning to selecting');
                  }}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  title="Refresh if stuck in waiting - no blockchain transaction needed"
                >
                  🔄 Refresh & Back to Menu
                </button>
              </div>
            </div>
          )}

          {/* Game Result Screen */}
          {gameState === 'result' && gameResult && (
            <div className="text-center py-8">
              <div className={`animate-bounce mb-6 flex justify-center ${gameResult.won ? 'animate-pulse' : ''}`}>
                <div className={`p-4 rounded-full backdrop-blur-sm border ${gameResult.won ? 'bg-green-500/20 border-green-400/30' : 'bg-red-500/20 border-red-400/30'}`}>
                  {gameResult.won ? (
                    <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                </div>
              </div>
              
              <h2 className={`text-3xl font-bold mb-4 ${gameResult.won ? 'text-green-400' : 'text-red-400'}`}>
                {gameResult.won ? '🎉 You Won!' : '😔 You Lost'}
              </h2>
              
              <div className="bg-black/30 rounded-xl p-6 mb-6 border border-white/10">
                <div className="text-lg text-gray-300 mb-2">Game Mode: {gameResult.mode}</div>
                {gameResult.won && gameResult.prize > 0 && (
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    Prize: <EthWithUsd amount={gameResult.prize} decimals={5} />
                  </div>
                )}
                {gameResult.type === 'battle_royale' && (
                  <div className="text-sm text-gray-400">
                    {gameResult.playersCount} players participated
                  </div>
                )}
              </div>

              <div className="text-sm text-gray-300 mb-6">
                {gameResult.won 
                  ? "Congratulations! Your prize has been sent to your wallet. 💰" 
                  : "Better luck next time! Ready for another round? 🎮"}
              </div>

              <div className="mb-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Share your result:</div>
                <ShareButtons 
                  message={gameResult.won 
                    ? `Just WON ${gameResult.prize.toFixed(5)} ETH in ${gameResult.mode}! 🏆⚡️ Try yourself at Crypto Duel!`
                    : `Just played ${gameResult.mode} at Crypto Duel! 🎮⚔️ Join me for the next battle!`
                  }
                  className="justify-center"
                />
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setGameState('selecting');
                    setGameResult(null);
                  }}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-6 py-3 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
                >
                  🎮 Play Again
                </button>
                <Link href="/user" className="block w-full bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors text-center">
                  📊 View My Games
                </Link>
              </div>
            </div>
          )}

          {/* Admin Analytics Panel */}
          {isAdmin && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-purple-400/30 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={20} className="text-yellow-400" />
                <h3 className="text-lg font-semibold text-purple-200">Admin Analytics</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="text-sm text-gray-300">Total Games</div>
                  <div className="text-2xl font-bold text-blue-400">{adminAnalytics.totalGames}</div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="text-sm text-gray-300">Total Volume</div>
                  <div className="text-2xl font-bold text-green-400">
                    <EthWithUsd amount={adminAnalytics.totalVolume} decimals={4} />
                  </div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="text-sm text-gray-300">Total Commissions</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    <EthWithUsd amount={adminAnalytics.totalCommissions} decimals={4} />
                  </div>
                </div>
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="text-sm text-gray-300">Popular Bet</div>
                  <div className="text-lg font-bold text-purple-400">{adminAnalytics.mostPopularBet}</div>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Games by Mode:</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="text-xs text-gray-400">🎯 Duels</div>
                    <div className="text-lg font-bold text-green-400">{adminAnalytics.gamesByMode.duels}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="text-xs text-gray-400">⚔️ BR5</div>
                    <div className="text-lg font-bold text-purple-400">{adminAnalytics.gamesByMode.br5}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="text-xs text-gray-400">🔥 BR100</div>
                    <div className="text-lg font-bold text-orange-400">{adminAnalytics.gamesByMode.br100}</div>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="text-xs text-gray-400">💥 BR1000</div>
                    <div className="text-lg font-bold text-red-400">{adminAnalytics.gamesByMode.br1000}</div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Games by Bet Amount:</h4>
                <div className="space-y-2">
                  {Object.entries(adminAnalytics.gamesByBet).map(([betValue, data]) => (
                    <div key={betValue} className="flex justify-between items-center bg-black/20 rounded-lg p-2 border border-white/10">
                      <div className="text-sm text-gray-300">{data.label}</div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{data.count} games</div>
                        <div className="text-xs text-gray-400">
                          <EthWithUsd amount={ethers.formatEther(data.volume.toString())} decimals={4} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}