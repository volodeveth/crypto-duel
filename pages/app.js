import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';
import FarcasterInit from '../components/FarcasterInit';

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
  "uint256 public totalDuels",
  "event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount)",
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)"
];

export default function DuelApp() {
  const baseUrl = 'https://cryptoduel.xyz';
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [userAddress, setUserAddress] = useState(null);
  const [gameState, setGameState] = useState('loading'); // loading, disconnected, selecting, waiting, result
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

  const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x238300D6570Deee3765d72Fa8e2af447612FaE06';
  const BASESCAN = 'https://basescan.org';

  useEffect(() => {
    setGameState('disconnected');
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
    if (!contract || !userAddress) return;
    try {
      const owner = await contract.owner();
      const isOwner = owner.toLowerCase() === userAddress.toLowerCase();
      setIsAdmin(isOwner);
      if (isOwner) await loadAdminAnalytics();
    } catch {
      setIsAdmin(false);
    }
  }

  async function loadAdminAnalytics() {
    if (!contract) return;
    const totalDuels = await contract.totalDuels();
    const analytics = {
      totalDuels: Number(totalDuels),
      totalVolume: 0,
      totalCommissions: 0,
      duelsByBet: {},
      duelsCount: 0
    };

    betAmounts.forEach(bet => {
      analytics.duelsByBet[bet.value] = { count: 0, volume: 0, label: bet.label };
    });

    const maxDuels = Math.min(Number(totalDuels), 1000);
    for (let i = 1; i <= maxDuels; i++) {
      try {
        const duel = await contract.getDuel(i);
        if (duel.completed) {
          const betAmount = duel.betAmount.toString();
          const totalPool = Number(duel.betAmount) * 2;
          const commission = totalPool * 0.10;

          analytics.totalVolume += totalPool;
          analytics.totalCommissions += commission;
          analytics.duelsCount++;

          if (analytics.duelsByBet[betAmount]) {
            analytics.duelsByBet[betAmount].count++;
            analytics.duelsByBet[betAmount].volume += totalPool;
          }
        }
      } catch {
        break;
      }
    }

    setAdminAnalytics({
      totalDuels: analytics.totalDuels,
      totalVolume: ethers.formatEther(analytics.totalVolume.toString()),
      totalCommissions: ethers.formatEther(analytics.totalCommissions.toString()),
      duelsByBet: analytics.duelsByBet,
      averageBet: analytics.duelsCount > 0
        ? ethers.formatEther((analytics.totalVolume / analytics.duelsCount / 2).toString())
        : '0',
      mostPopularBet: Object.values(analytics.duelsByBet).reduce((acc, v) => v.count > (acc.count || 0) ? v : acc, {}).label || 'None'
    });
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

  async function joinDuel(betAmount, ethValue) {
    if (!contract) return alert('Please connect your wallet first');

    try {
      setGameState('waiting');
      setSelectedBet({ amount: betAmount, eth: ethValue });

      // fresh provider & signer
      const freshProvider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await freshProvider.send('eth_requestAccounts', []);
      const freshSigner = await freshProvider.getSigner(accounts[0]);
      const freshContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, freshSigner);

      setProvider(freshProvider);
      setUserAddress(await freshSigner.getAddress());
      setContract(freshContract);

      const valueWei = BigInt(betAmount);
      const tx = await freshContract.joinDuel({ value: valueWei });
      setCurrentDuelTxHash(tx.hash);

      // save local pending for /user page
      try {
        localStorage.setItem('cd_currentWaiting', JSON.stringify({
          betAmount: betAmount.toString(),
          betEth: ethValue,
          txHash: tx.hash,
          startedAt: Date.now(),
          address: await freshSigner.getAddress()
        }));
      } catch {}

      await tx.wait();
      updateWaitingCounts();
    } catch (error) {
      console.error('Error joining duel:', error);
      setGameState('selecting');
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
          imageUrl: `${baseUrl}/icon.png`,
          button: { title: "🎮 Duel Now", action: { type: "launch_miniapp", name: "Crypto Duel", url: `${baseUrl}/app`, splashImageUrl: `${baseUrl}/icon.png`, splashBackgroundColor: "#8B5CF6" } }
        })} />
      </Head>

      <FarcasterInit />

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-md mx-auto p-4">

          {/* Header */}
          <div className="text-center mb-6">
            <div className="mb-2">
              <img src="/icon.png" alt="Crypto Duel" className="w-16 h-16 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold mb-1">Duel Arena</h1>

            <div className="flex items-center justify-center gap-3 mt-1">
              <Link href="/leaderboard" className="text-sm text-purple-200 hover:text-purple-100">🏆 Leaderboard</Link>
              <span className="opacity-40">•</span>
              <Link href="/user" className="text-sm text-purple-200 hover:text-purple-100">👤 My Duels</Link>
            </div>

            {user && (
              <p className="text-purple-200 text-sm mt-2">
                Welcome, {user.displayName || user.username}!
              </p>
            )}
            {userAddress && (
              <div className="mt-3 bg-gray-800/30 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Connected Wallet:</p>
                <p className="text-sm font-mono text-green-400 break-all mb-2">{userAddress}</p>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); try { localStorage.removeItem('cd_currentWaiting'); } catch {}; disconnectWallet(); }}
                  className="bg-red-600/80 hover:bg-red-600 px-3 py-1 rounded text-xs text-white transition-colors"
                  type="button"
                >
                  🔌 Disconnect
                </button>
              </div>
            )}
          </div>

          {/* User Stats */}
          {userStats.totalGames > 0 && (
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6 border border-gray-700">
              <div className="grid grid-cols-4 gap-3 text-center">
                <div><div className="text-xl font-bold text-blue-400">{userStats.totalGames}</div><div className="text-xs text-gray-400">Games</div></div>
                <div><div className="text-xl font-bold text-green-400">{userStats.wins}</div><div className="text-xs text-gray-400">Wins</div></div>
                <div><div className="text-xl font-bold text-red-400">{userStats.totalGames - userStats.wins}</div><div className="text-xs text-gray-400">Losses</div></div>
                <div><div className="text-xl font-bold text-yellow-400">{parseFloat(userStats.totalWinnings).toFixed(4)}</div><div className="text-xs text-gray-400">ETH Won</div></div>
              </div>
            </div>
          )}

          {/* Admin Analytics Panel */}
          {isAdmin && (
            <div className="bg-gradient-to-r from-purple-800/50 to-blue-800/50 rounded-lg p-4 mb-6 border border-purple-500/50">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">👑</span>
                <h3 className="text-lg font-semibold text-purple-200">Admin Analytics</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-sm text-gray-300">Total Duels</div>
                  <div className="text-2xl font-bold text-blue-400">{adminAnalytics.totalDuels}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-sm text-gray-300">Total Volume</div>
                  <div className="text-2xl font-bold text-green-400">
                    {parseFloat(adminAnalytics.totalVolume).toFixed(4)} ETH
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-sm text-gray-300">Total Commissions</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    {parseFloat(adminAnalytics.totalCommissions).toFixed(4)} ETH
                  </div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-sm text-gray-300">Popular Bet</div>
                  <div className="text-lg font-bold text-purple-400">{adminAnalytics.mostPopularBet}</div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-purple-200 mb-2">Duels by Bet Amount:</h4>
                <div className="space-y-2">
                  {Object.entries(adminAnalytics.duelsByBet).map(([betValue, data]) => (
                    <div key={betValue} className="flex justify-between items-center bg-black/10 rounded p-2">
                      <div className="text-sm text-gray-300">{data.label}</div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-white">{data.count} duels</div>
                        <div className="text-xs text-gray-400">
                          {ethers.formatEther(data.volume.toString())} ETH
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
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Choose Wallet Type</h2>
                <p className="text-gray-300 mb-6">Select how you want to connect your wallet</p>
                <div className="space-y-4">
                  <button onClick={() => connectFarcasterWallet().catch(e => alert(e.message))}
                          className="w-full bg-blue-600 hover:bg-blue-700 px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3">
                    <span className="text-2xl">🎯</span>
                    <div className="text-left">
                      <div className="font-semibold">Farcaster Wallet</div>
                      <div className="text-sm text-blue-200">Use built-in Farcaster wallet</div>
                    </div>
                  </button>
                  <button onClick={() => connectExternalWallet().catch(e => alert(e.message))}
                          className="w-full bg-orange-600 hover:bg-orange-700 px-6 py-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-3">
                    <span className="text-2xl">💳</span>
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
              <h2 className="text-xl font-semibold mb-4 text-center">Choose Your Bet</h2>
              <div className="space-y-3">
                {betAmounts.map((bet, idx) => (
                  <button key={idx} onClick={() => joinDuel(bet.value, bet.eth)}
                          className="w-full bg-gray-800/50 hover:bg-gray-700/50 p-4 rounded-lg border border-gray-600 transition-all duration-200 hover:border-purple-500">
                    <div className="flex justify-between items-center">
                      <div className="text-left">
                        <div className="font-semibold text-white">{bet.label}</div>
                        <div className="text-sm text-gray-400">Waiting: {waitingCount[bet.value] || 0} players</div>
                      </div>
                      <div className="text-right">
                        <div className="text-green-400 font-semibold">Win: {(bet.eth * 1.8).toFixed(5)} ETH</div>
                        <div className="text-sm text-yellow-400">1.8x multiplier</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-600/20 rounded-lg border border-blue-600/30 text-center text-sm text-blue-200">
                <strong>Fair Play:</strong> Winner determined by on-chain randomness
              </div>
            </div>
          )}

          {/* Waiting state */}
          {gameState === 'waiting' && selectedBet && (
            <div className="text-center py-8">
              <div className="animate-pulse-slow mb-6">
                <img src="/icon.png" alt="Finding opponent" className="w-24 h-24 mx-auto" />
              </div>
              <h2 className="text-2xl font-semibold mb-2">Waiting for the second player…</h2>
              <p className="text-gray-300 mb-2">Bet: {selectedBet.eth} ETH</p>
              <p className="text-gray-400 mb-5">
                You can stay here and wait, or come back later and check the result in{' '}
                <Link href="/user" className="underline text-purple-200 hover:text-purple-100">"My Duels"</Link>.
              </p>
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
                    +{parseFloat(lastResult.prize).toFixed(5)} ETH
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