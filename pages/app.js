import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';
import FarcasterInit from '../components/FarcasterInit';
import ShareButtons from '../components/ShareButtons';
import { EthWithUsd } from '../lib/ethPrice';
import { Wallet, Swords, Users, Crown, ExternalLink, Info } from 'lucide-react';

const CONTRACT_ABI = [
  "function joinDuel() external payable",
  "function getWaitingPlayersCount(uint256 betAmount) external view returns (uint256)",
  "function cancelWaiting() external",
  "function getAllowedBets() external view returns (uint256[])",
  "function getPlayerStats(address player) external view returns (uint256 totalGames, uint256 wins, uint256 totalWinnings)",
  "function owner() external view returns (address)",
  "function withdrawCommissions() external",
  "function getCommissionBalance() external view returns (uint256)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))",
  "function totalDuels() external view returns (uint256)",
  "event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount)",
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)"
];

export default function DuelApp() {
  const baseUrl = 'https://cryptoduel.xyz';
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [gameState, setGameState] = useState('loading'); // loading, disconnected, selecting, confirming, waiting, result
  const [waitingCount, setWaitingCount] = useState({});
  const [selectedBet, setSelectedBet] = useState(null);
  const [userStats, setUserStats] = useState({ totalGames: 0, wins: 0, totalWinnings: 0 });
  const [lastResult, setLastResult] = useState(null);
  const [manuallyDisconnected, setManuallyDisconnected] = useState(false);
  const [currentDuelTxHash, setCurrentDuelTxHash] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAnalytics, setAdminAnalytics] = useState({
    totalDuels: 0,
    totalVolume: '0',
    totalCommissions: '0',
    duelsByBet: {},
    averageBet: '0',
    mostPopularBet: '0'
  });

  const betAmounts = [
    { value: '10000000000000', label: '0.00001 ETH', eth: 0.00001 },
    { value: '100000000000000', label: '0.0001 ETH', eth: 0.0001 },
    { value: '1000000000000000', label: '0.001 ETH', eth: 0.001 },
    { value: '10000000000000000', label: '0.01 ETH', eth: 0.01 }
  ];

  // Force new contract address - override any cached env vars
  const CONTRACT_ADDRESS = '0x238300D6570Deee3765d72Fa8e2af447612FaE06';
  const BASESCAN = 'https://basescan.org';

  useEffect(() => {
    setGameState('disconnected');
    
    // Clear old localStorage data from previous contract
    try {
      const currentWaiting = localStorage.getItem('cd_currentWaiting');
      if (currentWaiting) {
        const data = JSON.parse(currentWaiting);
        // Remove if from old contract (not our new contract)
        const isOldContract = !data.contractAddress || data.contractAddress !== CONTRACT_ADDRESS;
        if (isOldContract) {
          console.log('🧹 Clearing old contract data from localStorage');
          localStorage.removeItem('cd_currentWaiting');
        }
      }
      
      // Also clear other potential cached data
      const lastContractVersion = localStorage.getItem('cd_contract_version');
      if (lastContractVersion !== CONTRACT_ADDRESS) {
        console.log('🧹 New contract detected, clearing all cached data');
        // Clear all crypto-duel related localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('cd_')) {
            localStorage.removeItem(key);
          }
        });
        // Set new contract version
        localStorage.setItem('cd_contract_version', CONTRACT_ADDRESS);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (contract && userAddress) {
      updateWaitingCounts();
      loadUserStats();
      checkAdminStatus();
      setupEventListeners();
    }
  }, [contract, userAddress]);

  useEffect(() => {
    if (window.ethereum && provider && !manuallyDisconnected) {
      const handleAccountsChanged = async (accounts) => {
        if (manuallyDisconnected) return;
        if (accounts.length === 0) {
          setProvider(null);
          setContract(null);
          setUserAddress(null);
          setGameState('disconnected');
        } else {
          const newAddress = accounts[0];
          if (newAddress.toLowerCase() !== userAddress?.toLowerCase()) {
            try {
              const walletProvider = new ethers.BrowserProvider(window.ethereum);
              const signer = await walletProvider.getSigner();
              const address = await signer.getAddress();
              const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
              setProvider(walletProvider);
              setContract(contractInstance);
              setUserAddress(address);
            } catch {}
          }
        }
      };

      const handleChainChanged = () => window.location.reload();

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [provider, userAddress, manuallyDisconnected]);

  async function connectFarcasterWallet() {
    const { sdk } = await import('@farcaster/miniapp-sdk');
    if (!sdk.wallet) throw new Error('Farcaster wallet not available');
    const prov = await sdk.wallet.ethProvider();
    if (!prov) throw new Error('Could not get Farcaster wallet provider');

    const walletProvider = new ethers.BrowserProvider(prov);
    const signer = await walletProvider.getSigner();
    const address = await signer.getAddress();
    const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    setManuallyDisconnected(false);
    setProvider(walletProvider);
    setContract(contractInstance);
    setUserAddress(address);
    setGameState('selecting');
  }

  async function connectExternalWallet() {
    if (!window.ethereum) throw new Error('Please install MetaMask or another Web3 wallet');
    const walletProvider = new ethers.BrowserProvider(window.ethereum);
    await walletProvider.send('eth_requestAccounts', []);

    const currentNetwork = await walletProvider.getNetwork();
    if (currentNetwork.chainId !== 8453n) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // Base Mainnet
        });
      } catch (switchError) {
        if (switchError.code === 4902) await addBaseNetwork();
      }
    }

    const signer = await walletProvider.getSigner();
    const address = await signer.getAddress();
    const contractInstance = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    setManuallyDisconnected(false);
    setProvider(walletProvider);
    setContract(contractInstance);
    setUserAddress(address);
    setGameState('selecting');
  }

  async function addBaseNetwork() {
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: '0x2105',
        chainName: 'Base Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://mainnet.base.org'],
        blockExplorerUrls: ['https://basescan.org']
      }]
    });
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }],
      });
    } catch {}
  }

  async function updateWaitingCounts() {
    if (!contract) return;
    const counts = {};
    for (const bet of betAmounts) {
      try {
        const count = await contract.getWaitingPlayersCount(bet.value);
        counts[bet.value] = Number(count);
      } catch {
        counts[bet.value] = 0;
      }
    }
    setWaitingCount(counts);
  }

  async function loadUserStats() {
    if (!contract || !userAddress) return;
    try {
      const [totalGames, wins, totalWinnings] = await contract.getPlayerStats(userAddress);
      setUserStats({
        totalGames: Number(totalGames),
        wins: Number(wins),
        totalWinnings: ethers.formatEther(totalWinnings)
      });
    } catch {}
  }

  async function checkAdminStatus() {
    console.log('🔍 Checking admin status...', { contract: !!contract, userAddress });
    
    if (!contract || !userAddress) {
      console.log('❌ Missing contract or userAddress for admin check');
      return;
    }
    
    try {
      console.log('📡 Calling contract.owner()...');
      const owner = await contract.owner();
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
      
      console.log('👑 Admin check result:', {
        contractOwner: owner,
        currentUser: userAddress,
        isOwner,
        contractAddress: CONTRACT_ADDRESS
      });
      
      setIsAdmin(isOwner);
      
      if (isOwner) {
        console.log('🔥 User is admin! Loading admin analytics...');
        await loadAdminAnalytics();
      } else {
        console.log('👤 User is not admin');
      }
    } catch (error) {
      console.error('❌ Admin check failed:', error);
      setIsAdmin(false);
    }
  }

  async function loadAdminAnalytics() {
    if (!contract) return;
    
    try {
      const totalDuels = await contract.totalDuels();
      
      const analytics = {
        totalDuels: Number(totalDuels),
        totalVolume: 0n, // BigInt
        totalCommissions: 0n, // BigInt
        duelsByBet: {},
        duelsCount: 0
      };

    betAmounts.forEach(bet => {
      analytics.duelsByBet[bet.value] = { count: 0, volume: 0n, label: bet.label }; // BigInt
    });

    const maxDuels = Math.min(Number(totalDuels), 1000);
    
    for (let i = 1; i <= maxDuels; i++) {
      try {
        const duel = await contract.getDuel(i);
        
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
          analytics.duelsCount++;

          if (analytics.duelsByBet[betAmount]) {
            analytics.duelsByBet[betAmount].count++;
            analytics.duelsByBet[betAmount].volume += totalPool;
          }
          
        }
      } catch (error) {
        continue;
      }
    }

      // Конвертуємо BigInt в рядки для ethers.formatEther
      const duelsByBetFormatted = {};
      Object.keys(analytics.duelsByBet).forEach(key => {
        duelsByBetFormatted[key] = {
          ...analytics.duelsByBet[key],
          volume: analytics.duelsByBet[key].volume.toString() // BigInt to string
        };
      });

      setAdminAnalytics({
        totalDuels: analytics.totalDuels,
        totalVolume: ethers.formatEther(analytics.totalVolume.toString()),
        totalCommissions: ethers.formatEther(analytics.totalCommissions.toString()),
        duelsByBet: duelsByBetFormatted,
        averageBet: analytics.duelsCount > 0
          ? ethers.formatEther((analytics.totalVolume / BigInt(analytics.duelsCount) / 2n).toString())
          : '0',
        mostPopularBet: Object.values(analytics.duelsByBet).reduce((acc, v) => v.count > (acc.count || 0) ? v : acc, {}).label || 'None'
      });
      
    } catch (error) {
      console.error('❌ Failed to load admin analytics:', error);
      
      // Set default analytics even if loading fails
      const defaultAnalytics = {
        totalDuels: 0,
        totalVolume: '0',
        totalCommissions: '0',
        duelsByBet: {},
        averageBet: '0',
        mostPopularBet: 'None'
      };
      
      betAmounts.forEach(bet => {
        defaultAnalytics.duelsByBet[bet.value] = { count: 0, volume: 0, label: bet.label };
      });
      
      setAdminAnalytics(defaultAnalytics);
      console.log('📊 Set default admin analytics due to error');
    }
  }

  function setupEventListeners() {
    if (!contract) return;
    contract.on('DuelCompleted', (duelId, winner, prize, randomSeed) => {
      const isWinner = winner.toLowerCase() === userAddress?.toLowerCase();
      const prizeEth = ethers.formatEther(prize);

      // clear local pending marker
      try { localStorage.removeItem('cd_currentWaiting'); } catch {}

      setLastResult({
        isWinner,
        prize: prizeEth,
        randomSeed: randomSeed.toString(),
        duelId: duelId.toString(),
        txHash: currentDuelTxHash
      });
      setGameState('result');
      loadUserStats();
    });

    return () => contract.removeAllListeners();
  }

  // New function to select bet and show confirmation
  function selectBet(betAmount, ethValue) {
    setSelectedBet({ amount: betAmount, eth: ethValue });
    setGameState('confirming');
  }

  // Modified function to confirm and join duel
  async function confirmAndJoinDuel() {
    if (!contract || !selectedBet) return alert('Please connect your wallet first');

    try {
      setGameState('waiting');

      // fresh provider & signer
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await freshProvider.send('eth_requestAccounts', []);
      const freshSigner = await freshProvider.getSigner(accounts[0]);
      const freshContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, freshSigner);

      setProvider(freshProvider);
      setUserAddress(await freshSigner.getAddress());
      setContract(freshContract);

      const valueWei = BigInt(selectedBet.amount);
      const tx = await freshContract.joinDuel({ value: valueWei });
      setCurrentDuelTxHash(tx.hash);

      // save local pending for /user page
      try {
        localStorage.setItem('cd_currentWaiting', JSON.stringify({
          betAmount: selectedBet.amount.toString(),
          betEth: selectedBet.eth,
          txHash: tx.hash,
          startedAt: Date.now(),
          address: await freshSigner.getAddress(),
          contractAddress: CONTRACT_ADDRESS // Track which contract this is for
        }));
      } catch {}

      await tx.wait();
      updateWaitingCounts();
    } catch (error) {
      console.error('Error joining duel:', error);
      setGameState('confirming'); // Return to confirmation screen on error
      if (error.code === 4001) alert('Transaction cancelled by user');
      else alert('Error joining duel: ' + (error?.message || String(error)));
    }
  }

  async function cancelWaiting() {
    if (!contract) return;
    try {
      const tx = await contract.cancelWaiting();
      await tx.wait();
      setGameState('selecting');
      updateWaitingCounts();
      try { localStorage.removeItem('cd_currentWaiting'); } catch {}
    } catch (error) {
      alert('Error cancelling: ' + error.message);
    }
  }

  function resetToSelection() {
    setGameState('selecting');
    setLastResult(null);
    setCurrentDuelTxHash(null);
    updateWaitingCounts();
  }

  function disconnectWallet() {
    setManuallyDisconnected(true);
    setProvider(null);
    setContract(null);
    setUserAddress(null);
    setUser(null);
    setGameState('disconnected');
    setUserStats({ totalGames: 0, wins: 0, totalWinnings: 0 });
    setWaitingCount({});
    setLastResult(null);
    setCurrentDuelTxHash(null);
    setIsAdmin(false);
    setAdminAnalytics({
      totalDuels: 0, totalVolume: '0', totalCommissions: '0',
      duelsByBet: {}, averageBet: '0', mostPopularBet: '0'
    });
    if (window.ethereum?.removeAllListeners) window.ethereum.removeAllListeners();
  }

  return (
    <>
      <Head>
        <title>Crypto Duel - Play Now</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="fc:miniapp" content={JSON.stringify({
          version: "1",
          imageUrl: `${baseUrl}/image.png`,
          button: { title: "🎮 Duel Now", action: { type: "launch_miniapp", name: "Crypto Duel", url: `${baseUrl}/app`, splashImageUrl: `${baseUrl}/splash.png`, splashBackgroundColor: "#8B5CF6" } }
        })} />
        <meta property="og:image" content={`${baseUrl}/image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content={`${baseUrl}/image.png`} />
      </Head>

      <FarcasterInit />

      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-blue-900 to-purple-900 text-white">
        <div className="max-w-md mx-auto p-4">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-2">
              <img src="/icon.png" alt="Crypto Duel" className="w-16 h-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-1 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Crypto Duel</h1>
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
                <Wallet size={14} /> My Duels
              </Link>
            </div>

            {user && (
              <p className="text-purple-200 text-sm mt-2">
                Welcome, {user.displayName || user.username}!
              </p>
            )}
            {userAddress && (
              <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20">
                <p className="text-xs text-gray-400 mb-1">Connected Wallet:</p>
                <p className="text-sm font-mono text-green-400 break-all mb-2">{userAddress}</p>
                <div className="flex justify-center">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); try { localStorage.removeItem('cd_currentWaiting'); } catch {}; disconnectWallet(); }}
                    className="bg-red-500/80 hover:bg-red-500 px-3 py-2 rounded-lg text-xs text-white transition-all duration-200 hover:scale-105 flex items-center gap-1"
                    type="button"
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

          {/* Admin Analytics Panel */}
          {isAdmin && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-purple-400/30 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Crown size={20} className="text-yellow-400" />
                <h3 className="text-lg font-semibold text-purple-200">Admin Analytics</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/30 rounded-xl p-3 border border-white/10">
                  <div className="text-sm text-gray-300">Total Duels</div>
                  <div className="text-2xl font-bold text-blue-400">{adminAnalytics.totalDuels}</div>
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

              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Duels by Bet Amount:</h4>
                <div className="space-y-2">
                  {Object.entries(adminAnalytics.duelsByBet).map(([betValue, data]) => (
                    <div key={betValue} className="flex justify-between items-center bg-black/20 rounded-lg p-2 border border-white/10">
                      <div className="text-sm text-gray-300">{data.label}</div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{data.count} duels</div>
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

          {/* Connect state */}
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
                      <div className="text-sm text-orange-200">MetaMask, WalletConnect, etc.</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Selecting bet */}
          {gameState === 'selecting' && (
            <div>
              <div className="mb-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Share the game with friends:</div>
                <ShareButtons 
                  message="Try yourself in crypto duel! 🎮⚡️ Bet ETH, fair blockchain results. Ready for the challenge?"
                  className="justify-center"
                />
              </div>
              
              <h2 className="text-xl font-semibold mb-4 text-center">Choose Your Bet</h2>
              <div className="space-y-3">
                {betAmounts.map((bet, idx) => (
                  <button key={idx} onClick={() => selectBet(bet.value, bet.eth)}
                          className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-xl border border-white/20 transition-all duration-300 hover:border-cyan-400 hover:scale-105 backdrop-blur-sm shadow-lg">
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-semibold text-white"><EthWithUsd amount={bet.eth} decimals={5} /></div>
                        <div className="text-sm text-gray-400">Waiting: {waitingCount[bet.value] || 0} players</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-semibold">Win: <EthWithUsd amount={bet.eth * 1.8} decimals={6} /></div>
                        <div className="text-sm text-yellow-400">1.8x multiplier</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 p-4 bg-cyan-400/10 rounded-xl border border-cyan-400/30 text-center text-sm text-cyan-200 backdrop-blur-sm">
                <strong>Fair Play:</strong> Winner determined by on-chain randomness
              </div>
            </div>
          )}

          {/* Confirmation state */}
          {gameState === 'confirming' && selectedBet && (
            <div className="text-center py-8">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-xl">
                <div className="mb-6">
                  <div className="p-4 bg-cyan-400/10 rounded-full mx-auto w-fit mb-4 border border-cyan-400/30">
                    <Swords size={48} className="text-cyan-400" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Confirm Your Bet
                  </h2>
                </div>
                
                <div className="bg-black/30 rounded-xl p-4 mb-6 border border-white/10">
                  <div className="text-sm text-gray-400 mb-2">Bet Amount:</div>
                  <div className="text-2xl font-bold text-white mb-3">
                    <EthWithUsd amount={selectedBet.eth} decimals={5} />
                  </div>
                  
                  <div className="text-sm text-gray-400 mb-2">Potential Win:</div>
                  <div className="text-xl font-bold text-green-400">
                    <EthWithUsd amount={selectedBet.eth * 1.8} decimals={6} />
                  </div>
                  <div className="text-sm text-yellow-400 mt-1">1.8x multiplier</div>
                </div>
                
                <div className="bg-cyan-400/10 rounded-xl p-4 mb-6 border border-cyan-400/30 text-center text-sm text-cyan-200">
                  <strong>50/50 chance to win!</strong> Winner determined by on-chain randomness
                </div>
                
                <div className="space-y-3">
                  <button 
                    onClick={confirmAndJoinDuel}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
                  >
                    <Swords size={20} className="text-white" />
                    🎮 Make Your Bet
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

          {/* Waiting state */}
          {gameState === 'waiting' && selectedBet && (
            <div className="text-center py-8">
              <div className="animate-pulse-slow mb-6 flex justify-center">
                <div className="p-4 bg-white/10 rounded-full backdrop-blur-sm border border-white/20">
                  <Swords size={48} className="text-cyan-400" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Waiting for the second player…</h2>
              <p className="text-gray-300 mb-2">Bet: {selectedBet.eth} ETH</p>
              <p className="text-gray-400 mb-5">
                You can stay here and wait, or come back later and check the result in{' '}
                <Link href="/user" className="underline text-purple-200 hover:text-purple-100">"My Duels"</Link>.
              </p>
              
              <div className="mb-6 text-center">
                <div className="text-sm text-gray-300 mb-3">Share with friends to find an opponent faster:</div>
                <ShareButtons 
                  message="I'm waiting for an opponent in crypto duel! 🔥⚔️ Join me for an ETH duel on the blockchain!"
                  className="justify-center"
                />
              </div>
              <div className="flex flex-col gap-3 items-center">
                <Link href="/user" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  👤 Go to My Duels
                </Link>
                <button onClick={cancelWaiting} className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  ❌ Cancel & Refund
                </button>
              </div>
            </div>
          )}

          {/* Result */}
          {gameState === 'result' && lastResult && (
            <div className="text-center py-8">
              <div className={`text-8xl mb-6 ${lastResult.isWinner ? 'animate-bounce' : ''}`}>
                {lastResult.isWinner ? '🏆' : '💀'}
              </div>
              <div className={`text-3xl font-bold mb-4 ${lastResult.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                {lastResult.isWinner ? 'YOU WON!' : 'YOU LOST!'}
              </div>

              {lastResult.isWinner && (
                <div className="bg-green-600/20 rounded-lg p-4 mb-6 border border-green-600/30">
                  <div className="text-2xl font-bold text-green-400 mb-2">
                    +<EthWithUsd amount={lastResult.prize} decimals={5} />
                  </div>
                  <div className="text-sm text-green-300">Prize sent to your wallet!</div>
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 text-left">
                  <div className="text-sm text-gray-400 mb-2">Random Seed:</div>
                  <div className="font-mono text-xs text-gray-300 break-all">{lastResult.randomSeed}</div>
                  <div className="text-xs text-gray-500 mt-2">Provably fair result</div>
                </div>

                {(lastResult.txHash || lastResult.duelId) && (
                  <div className="bg-blue-800/30 rounded-lg p-4 border border-blue-600/30 text-left">
                    <div className="text-sm text-blue-200 mb-2">Duel ID: #{lastResult.duelId}</div>

                    {lastResult.txHash && (
                      <>
                        <div className="text-sm text-gray-400 mb-1">DuelCompleted event in transaction:</div>
                        <a
                          href={`${BASESCAN}/tx/${lastResult.txHash}#eventlog`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded text-sm text-white transition-colors"
                        >
                          🔍 Open duel on BaseScan (event log)
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </>
                    )}

                    <div className="mt-3">
                      <a
                        href={`${BASESCAN}/address/${CONTRACT_ADDRESS}#events`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs underline text-blue-200 hover:text-blue-100"
                      >
                        View all contract events
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center gap-3">
                <button onClick={resetToSelection} className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-semibold transition-colors">
                  ▶️ Play Again
                </button>
                <Link href="/user" className="bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition-colors">
                  👤 My Duels
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}