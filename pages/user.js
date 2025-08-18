import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ethers } from 'ethers';
import ShareButtons from '../components/ShareButtons';
import { EthWithUsd } from '../lib/ethPrice';
import { Wallet, Swords, ExternalLink, History, ArrowLeft } from 'lucide-react';

const CONTRACT_ABI = [
  "event DuelCompleted(uint256 indexed duelId, address winner, uint256 prize, uint256 randomSeed)",
  "event PlayerWaiting(uint256 indexed waitingId, address player, uint256 betAmount)",
  "event DuelStarted(uint256 indexed duelId, address player1, address player2, uint256 betAmount)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))",
  "function totalDuels() external view returns (uint256)",
  "function waitingPlayers(uint256 waitingId) external view returns (tuple(address player, uint256 betAmount, uint256 joinTime, bool active))"
];

const RPC = 'https://mainnet.base.org';
const BASESCAN = 'https://basescan.org';
const CONTRACT_ADDRESS = '0x238300D6570Deee3765d72Fa8e2af447612FaE06';

const short = (a='') => a ? `${a.slice(0,6)}...${a.slice(-4)}` : '';

export default function UserPage() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [duels, setDuels] = useState([]);
  const [pendingLocal, setPendingLocal] = useState(null);

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
            // Auto-load duels after detecting wallet
            setTimeout(() => {
              loadMyDuelsWithAddress(connectedAddress);
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
      // Auto-load duels after connecting
      setTimeout(() => {
        if (newAddress) {
          loadMyDuels();
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
      const provider = new ethers.JsonRpcProvider(RPC);
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
            
            // Check if still active in contract
            const waitingPlayer = await contract.waitingPlayers(waitingId);
            if (waitingPlayer.active) {
              pendingDuels.push({
                id: `wait-${waitingId}`,
                player1: decoded.args.player,
                player2: '0x0000000000000000000000000000000000000000',
                betEth: Number(ethers.formatEther(decoded.args.betAmount)),
                timestamp: Date.now(), // Use current time as approximation
                completed: false,
                isWaiting: true
              });
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
          // Add pendingLocal as a pending duel
          pendingDuels.push({
            id: `local-waiting`,
            player1: targetAddress,
            player2: '0x0000000000000000000000000000000000000000',
            betEth: pendingLocal.betEth,
            timestamp: pendingLocal.startedAt || Date.now(),
            completed: false,
            isWaiting: true,
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

  const hasAny = useMemo(() => duels.length > 0, [duels]);
  const pendingDuels = useMemo(() => duels.filter(d => !d.completed), [duels]);
  const completedDuels = useMemo(() => duels.filter(d => d.completed), [duels]);

  return (
    <>
      <Head>
        <title>My Duels — Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="My Duels - Crypto Duel" />
        <meta property="og:description" content="Check your crypto duel history and results" />
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">My Duels</h1>
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
                <button onClick={loadMyDuels} className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg flex items-center justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!address || loading}>
                  <History size={14} /> {loading ? 'Loading…' : 'Load history'}
                </button>
              </div>
            </div>
          </div>


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