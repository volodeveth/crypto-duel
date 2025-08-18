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
  "function getWaitingPlayersCount(uint8 mode, uint256 betAmount) external view returns (uint256)"
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
      // Test the connection
      await provider.getBlockNumber();
      return provider;
    } catch (error) {
      console.warn(`RPC ${rpcUrl} failed, trying next...`);
      continue;
    }
  }
  throw new Error('All RPC endpoints failed');
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
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.listAccounts();
          if (accounts.length > 0) {
            const connectedAddress = accounts[0].address;
            setAddress(connectedAddress);
            // Auto-load games after detecting wallet
            setTimeout(() => {
              loadMyDuelsWithAddress(connectedAddress);
              loadMyBattleRoyales();
              setTimeout(() => loadWaitingCounts(connectedAddress), 200); // Delay waiting counts
            }, 100);
          }
        }
      } catch (error) {
        console.warn('Failed to auto-detect wallet:', error.message);
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
          loadMyDuels();
          loadMyBattleRoyales();
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
      const provider = await createProviderWithFallback();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const totalDuels = Number(await contract.totalDuels());
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
          const d = await contract.getDuel(i);
          
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

      // Load waiting players (simplified - just check recent waiting players)
      try {
        // Only check for waiting players from recent blocks to avoid timeout
        const recentBlockNumber = await provider.getBlockNumber();
        const fromBlock = Math.max(0, recentBlockNumber - 10000); // Last ~10000 blocks

        const waitingLogs = await provider.getLogs({
          fromBlock: fromBlock,
          toBlock: 'latest',
          address: CONTRACT_ADDRESS,
          topics: [playerWaitingTopic]
        });

        for (const log of waitingLogs) {
          try {
            const decoded = iface.parseLog(log);
            const waitingId = Number(decoded.args.waitingId);
            
            // Filter by player address (since it's not indexed)
            if (decoded.args.player.toLowerCase() !== targetAddress.toLowerCase()) {
              continue;
            }
            
            // Check if still active in contract with proper error handling
            try {
              const waitingPlayer = await contract.waitingPlayers(waitingId);
              if (waitingPlayer.active) {
                pendingDuels.push({
                  id: `wait-${waitingId}`,
                  player1: decoded.args.player,
                  player2: '0x0000000000000000000000000000000000000000',
                  betEth: Number(ethers.formatEther(decoded.args.betAmount)),
                  timestamp: Date.now(), // Use current time as approximation
                  completed: false,
                  isWaiting: true,
                  mode: Number(decoded.args.mode) || 0 // Include mode from PlayerWaiting event
                });
              }
            } catch (error) {
              console.warn(`Failed to load waitingPlayers(${waitingId}):`, error.message);
              // Skip this waiting player and continue with the next one
              continue;
            }
          } catch (e) {
            console.warn('Error processing waiting log:', e);
          }
        }
      } catch (e) {
        console.warn('Error loading waiting players:', e);
      }

      // Add pendingLocal as a pending duel if it exists and no matching duel found
      if (pendingLocal && pendingLocal.address?.toLowerCase() === targetAddress.toLowerCase()) {
        const hasMatchingDuel = [...pendingDuels, ...completedDuels].some(d => 
          d.player1.toLowerCase() === targetAddress.toLowerCase()
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
    if (!address) return;
    setLoading(true);
    try {
      const provider = await createProviderWithFallback();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const totalBattles = Number(await contract.totalBattleRoyales());
      const max = Math.min(totalBattles, 1000);

      const battles = [];

      // Load all battle royales (similar to duels)
      for (let i = 1; i <= max; i++) {
        try {
          const br = await contract.getBattleRoyale(i);
          
          // Skip if battle royale doesn't exist
          if (!br.players || br.players.length === 0) {
            continue;
          }
          
          // Check if user is a participant
          const isParticipant = br.players.some(
            player => player.toLowerCase() === address.toLowerCase()
          );

          if (!isParticipant) continue;

          const isWinner = br.winner?.toLowerCase() === address.toLowerCase();
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

      battles.sort((a, b) => Number(b.id) - Number(a.id));
      setBattleRoyales(battles);
    } catch (e) {
      console.error('Failed to load battle royales:', e);
      alert('Failed to load battle royales: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadWaitingCounts(targetAddress = address) {
    if (!targetAddress) return;
    
    try {
      const provider = await createProviderWithFallback();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      // Use EXACT same logic as app.js
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
      
      // Get waiting counts for all modes and bet amounts
      for (const mode of gameModes) {
        counts[mode.id] = {};
        for (const bet of betAmounts) {
          try {
            const count = await contract.getWaitingPlayersCount(mode.id, bet.value);
            counts[mode.id][bet.value] = Number(count);
          } catch (error) {
            counts[mode.id][bet.value] = 0;
          }
        }
      }
      
      setWaitingCounts(counts);
    } catch (e) {
      console.error('Failed to load waiting counts:', e);
    }
  }

  const hasAny = useMemo(() => duels.length > 0 || battleRoyales.length > 0, [duels, battleRoyales]);
  const pendingDuels = useMemo(() => duels.filter(d => !d.completed && (d.mode === undefined || d.mode === 0)), [duels]); // Only 1v1 duels
  const pendingBattleRoyales = useMemo(() => duels.filter(d => !d.completed && d.mode > 0), [duels]); // Battle Royale modes
  const completedDuels = useMemo(() => duels.filter(d => d.completed && (d.mode === undefined || d.mode === 0)), [duels]); // Only 1v1 duels
  const completedBattleRoyalesFromDuels = useMemo(() => duels.filter(d => d.completed && d.mode > 0), [duels]); // Completed BR from duels array

  return (
    <>
      <Head>
        <title>My Games — Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
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
            <div className="mb-2">
              <img src="/icon.png" alt="Crypto Duel" className="w-14 h-14 mx-auto" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">My Games</h1>
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
                👑 Battle Royales ({pendingBattleRoyales.length + battleRoyales.length + completedBattleRoyalesFromDuels.length})
              </button>
            </div>
          </div>

          {/* Duels Tab Content */}
          {activeTab === 'duels' && (
            <>
              {/* Pending battles */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden mb-6 shadow-xl">
            <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
              Pending battles {pendingDuels.length > 0 ? `(${pendingDuels.length})` : ''}
            </div>

            {pendingDuels.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400">
                No pending battles found.
              </div>
            )}

            {pendingDuels.length > 0 && (
              <div className="divide-y divide-gray-700">
                {pendingDuels.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        {d.id.startsWith('local-') || d.id.startsWith('wait-') ? (
                          <span className="text-gray-400">Waiting for opponent</span>
                        ) : (
                          <>
                            <Link href={`/duel/${d.id}`} className="underline decoration-dotted hover:text-white">
                              Duel #{d.id}
                            </Link>{' '}
                            <span className="text-yellow-400">Waiting for opponent</span>
                          </>
                        )}
                      </div>
                      <div className="text-sm text-yellow-400 font-semibold"><EthWithUsd amount={d.betEth} decimals={5} /></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {short(d.player1)} vs {d.player2 === '0x0000000000000000000000000000000000000000' ? 'waiting...' : short(d.player2)} • {d.timestamp ? new Date(d.timestamp).toLocaleString() : ''} {d.isWaiting ? '(waiting for opponent)' : ''}
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
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed battles */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
              Completed battles {completedDuels.length > 0 ? `(${completedDuels.length})` : ''}
            </div>

            {completedDuels.length === 0 && !loading && (
              <div className="p-6 text-center text-gray-400">
                {hasAny ? 'No completed battles found.' : address ? 'Click "Load history" to fetch your battle results.' : 'Enter your wallet address and click "Load history" to see your battles.'}
              </div>
            )}

            {completedDuels.length > 0 && (
              <div className="divide-y divide-gray-700">
                {completedDuels.map((d) => (
                  <div key={d.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-300">
                        <Link href={`/duel/${d.id}`} className="underline decoration-dotted hover:text-white">
                          Duel #{d.id}
                        </Link>{' '}
                        <span className={d.isWinner ? 'text-green-400' : 'text-red-400'}>
                          {d.isWinner ? 'Win' : 'Loss'}
                        </span>
                      </div>
                      <div className="text-sm text-yellow-400 font-semibold"><EthWithUsd amount={d.betEth} decimals={5} /></div>
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
                                const totalNeeded = d.mode === 1 ? 5 : d.mode === 2 ? 100 : d.mode === 3 ? 1000 : 0;
                                // Use EXACT same logic as app.js Choose Your Bet
                                const betValue = ethers.parseEther(d.betEth.toString()).toString();
                                const waitingForMode = waitingCounts[d.mode] && waitingCounts[d.mode][betValue] ? waitingCounts[d.mode][betValue] : 0;
                                return `${waitingForMode}/${totalNeeded}`;
                              })()}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400">Multiplier</div>
                            <div className="text-green-400 font-semibold">
                              {d.mode === 1 ? '4.5x' : 
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
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Completed Battle Royales */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 overflow-hidden shadow-xl">
                <div className="px-4 py-3 bg-black/20 border-b border-white/20 font-semibold">
                  Completed battles {(battleRoyales.length + completedBattleRoyalesFromDuels.length) > 0 ? `(${battleRoyales.length + completedBattleRoyalesFromDuels.length})` : ''}
                </div>

                {(battleRoyales.length + completedBattleRoyalesFromDuels.length) === 0 && !loading && (
                  <div className="p-6 text-center text-gray-400">
                    {hasAny ? 'No completed battles found.' : address ? 'Click "Load history" to fetch your battle results.' : 'Enter your wallet address and click "Load history" to see your battles.'}
                  </div>
                )}

                {(battleRoyales.length > 0 || completedBattleRoyalesFromDuels.length > 0) && (
                <div className="divide-y divide-gray-700">
                  {/* Battle Royales from API */}
                  {battleRoyales.map((br) => (
                    <div key={`br-${br.id}`} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-300">
                          <span className="font-semibold text-white">Battle #{br.id}</span> • {br.mode}
                        </div>
                        <div className={`text-lg font-semibold ${br.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                          {br.isWinner ? '🏆 WON' : '💀 LOST'}
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

                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="text-xs text-gray-400 mb-2">Share this battle result:</div>
                        <ShareButtons 
                          message={`Just ${br.isWinner ? 'WON' : 'fought'} in a ${br.mode} battle royale! 🏆⚔️ ${br.playersCount} players, ${br.betEth.toFixed(5)} ETH each. ${br.isWinner ? 'Champion of the arena!' : 'The battle continues!'}`}
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
                      
                      <div className="text-xs text-gray-400 mb-3">
                        {new Date(d.timestamp * 1000).toLocaleString()}
                      </div>

                      {d.isWinner && d.winAmount && (
                        <div className="bg-green-600/20 rounded-lg p-3 mb-3 border border-green-600/30">
                          <div className="text-sm text-green-300 mb-1">Prize Won:</div>
                          <div className="text-lg font-semibold text-green-400">
                            <EthWithUsd ethAmount={d.winAmount} />
                          </div>
                        </div>
                      )}

                      {d.txHash && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <a 
                            href={`${BASESCAN}/tx/${d.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                          >
                            🔎 View transaction <ExternalLink size={12} />
                          </a>
                        </div>
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