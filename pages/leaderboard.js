import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Head from 'next/head';
import Link from 'next/link';

const CONTRACT_ABI = [
  "function getPlayerStats(address player) external view returns (uint256 totalGames, uint256 wins, uint256 totalWinnings)",
  "function getDuel(uint256 duelId) external view returns (tuple(uint256 id, address player1, address player2, uint256 betAmount, uint256 timestamp, address winner, bool completed, uint256 randomSeed))",
  "function totalDuels() external view returns (uint256)",
  "function nextDuelId() external view returns (uint256)"
];

export default function Leaderboard() {
  const baseUrl = 'https://cryptoduel.xyz';
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('wins'); // wins, games, winnings, winRate

  const CONTRACT_ADDRESS = '0x238300D6570Deee3765d72Fa8e2af447612FaE06';

  useEffect(() => {
    loadLeaderboard();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadLeaderboard();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    console.log('🏆 Loading leaderboard data...');

    try {
      // Connect to contract
      const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      // Get next duel ID to include all created duels (completed and pending)
      const nextId = await contract.nextDuelId();
      const totalDuels = await contract.totalDuels(); // Keep for logging
      console.log('📈 Next duel ID:', nextId.toString(), '| Completed duels:', totalDuels.toString());

      // Collect all unique players
      const playersMap = new Map();
      const maxDuels = Math.min(Number(nextId) - 1, 2000); // Use nextId - 1 because IDs start from 1

      for (let i = 1; i <= maxDuels; i++) {
        try {
          const duel = await contract.getDuel(i);
          
          // Skip if duel doesn't exist (empty data)
          if (!duel.player1 || duel.player1 === '0x0000000000000000000000000000000000000000') {
            continue;
          }
          
          // Add both players to our map (from ALL duels, not just completed)
          // This ensures we capture all players who have ever participated
          if (!playersMap.has(duel.player1)) {
            playersMap.set(duel.player1, true);
          }
          if (duel.player2 && duel.player2 !== '0x0000000000000000000000000000000000000000') {
            if (!playersMap.has(duel.player2)) {
              playersMap.set(duel.player2, true);
            }
          }
        } catch (error) {
          console.log(`⚠️ Could not load duel ${i}:`, error.message);
          continue;
        }
      }

      const uniquePlayers = Array.from(playersMap.keys());
      console.log('👥 Found unique players:', uniquePlayers.length);

      // Get stats for each player
      const playersStats = [];
      for (const playerAddress of uniquePlayers) {
        try {
          // Try contract getPlayerStats first
          const [totalGames, wins, totalWinnings] = await contract.getPlayerStats(playerAddress);
          
          console.log(`🔍 Player ${playerAddress.slice(0, 8)}: games=${Number(totalGames)}, wins=${Number(wins)}, winnings=${ethers.formatEther(totalWinnings)}`);
          
          if (Number(totalGames) > 0) { // Only include players who have played
            const winRate = Number(totalGames) > 0 ? (Number(wins) / Number(totalGames) * 100) : 0;
            
            playersStats.push({
              address: playerAddress,
              totalGames: Number(totalGames),
              wins: Number(wins),
              losses: Number(totalGames) - Number(wins),
              totalWinnings: ethers.formatEther(totalWinnings),
              winRate: winRate
            });
          } else {
            console.log(`⚠️ Player ${playerAddress.slice(0, 8)} has 0 games - skipping`);
          }
        } catch (error) {
          console.log(`⚠️ getPlayerStats failed for ${playerAddress.slice(0, 8)}: ${error.message}`);
          console.log(`🔄 Trying manual calculation...`);
          
          // Fallback: calculate stats manually from duels
          try {
            let totalGames = 0;
            let wins = 0;
            let totalWinnings = ethers.parseEther("0");
            
            for (let i = 1; i < maxDuels + 1; i++) {
              try {
                const duel = await contract.getDuel(i);
                
                if (duel.player1 === playerAddress || duel.player2 === playerAddress) {
                  if (duel.completed) {
                    totalGames++;
                    if (duel.winner === playerAddress) {
                      wins++;
                      // Calculate winnings: total pool - owner fee
                      const totalPool = duel.betAmount * 2n;
                      const ownerFee = (totalPool * 10n) / 100n; // 10% fee
                      const winnerPrize = totalPool - ownerFee;
                      totalWinnings += winnerPrize;
                    }
                  }
                }
              } catch (duelError) {
                // Skip invalid duels
                continue;
              }
            }
            
            console.log(`🔄 Manual calc for ${playerAddress.slice(0, 8)}: games=${totalGames}, wins=${wins}, winnings=${ethers.formatEther(totalWinnings)}`);
            
            if (totalGames > 0) {
              const winRate = totalGames > 0 ? (wins / totalGames * 100) : 0;
              
              playersStats.push({
                address: playerAddress,
                totalGames: totalGames,
                wins: wins,
                losses: totalGames - wins,
                totalWinnings: ethers.formatEther(totalWinnings),
                winRate: winRate
              });
            } else {
              console.log(`⚠️ Player ${playerAddress.slice(0, 8)} has 0 games after manual calc - skipping`);
            }
          } catch (fallbackError) {
            console.log(`❌ Manual calculation also failed for ${playerAddress.slice(0, 8)}: ${fallbackError.message}`);
          }
        }
      }

      console.log('📊 Player stats loaded:', playersStats.length);
      setLeaderboardData(playersStats);
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const sortedData = [...leaderboardData].sort((a, b) => {
    switch (sortBy) {
      case 'wins':
        return b.wins - a.wins;
      case 'games':
        return b.totalGames - a.totalGames;
      case 'winnings':
        return parseFloat(b.totalWinnings) - parseFloat(a.totalWinnings);
      case 'winRate':
        return b.winRate - a.winRate;
      default:
        return b.wins - a.wins;
    }
  });

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankEmoji = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <>
      <Head>
        <title>Leaderboard - Crypto Duel</title>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Leaderboard - Crypto Duel" />
        <meta property="og:description" content="Top players in Crypto Duel Arena - See who's winning the most ETH!" />
        <meta property="og:image" content="https://cryptoduel.xyz/image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="800" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://cryptoduel.xyz/image.png" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
        <div className="max-w-4xl mx-auto p-4">
          
          {/* Header */}
          <div className="text-center mb-8">
            <div className="mb-2">
              <img src="/icon.png" alt="Crypto Duel" className="w-16 h-16 mx-auto" />
            </div>
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">Leaderboard</h1>
            <p className="text-gray-300 mb-4">Top players in Crypto Duel Arena</p>
            
            <div className="flex items-center justify-center gap-3">
              <Link 
                href="/app"
                className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                🎮 Back to Game
              </Link>
              
              <button
                onClick={loadLeaderboard}
                disabled={loading}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                  loading 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {loading ? '🔄' : '🔄'} {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <button
              onClick={() => setSortBy('wins')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'wins' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              🏆 Most Wins
            </button>
            <button
              onClick={() => setSortBy('games')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'games' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              🎮 Most Games
            </button>
            <button
              onClick={() => setSortBy('winnings')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'winnings' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              💰 Most Winnings
            </button>
            <button
              onClick={() => setSortBy('winRate')}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                sortBy === 'winRate' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
              }`}
            >
              📈 Best Win Rate
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin mb-4">
                <img src="/icon.png" alt="Loading" className="w-16 h-16 mx-auto" />
              </div>
              <p className="text-lg">Loading leaderboard...</p>
              <p className="text-sm text-gray-400">This may take a moment</p>
            </div>
          )}

          {/* Leaderboard Table */}
          {!loading && (
            <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Rank</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Player</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Games</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Wins</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Losses</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Win Rate</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-300">Total Winnings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {sortedData.map((player, index) => (
                      <tr key={player.address} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="text-lg">{getRankEmoji(index)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-mono text-sm">
                            {formatAddress(player.address)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-blue-400 font-semibold">{player.totalGames}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-green-400 font-semibold">{player.wins}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-red-400 font-semibold">{player.losses}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-purple-400 font-semibold">
                            {player.winRate.toFixed(1)}%
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="text-yellow-400 font-semibold">
                            {parseFloat(player.totalWinnings).toFixed(4)} ETH
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {sortedData.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="mb-4">
                    <img src="/icon.png" alt="Empty leaderboard" className="w-24 h-24 mx-auto opacity-50" />
                  </div>
                  <p className="text-xl text-gray-300">No players found yet</p>
                  <p className="text-sm text-gray-500">Be the first to play and claim the top spot!</p>
                </div>
              )}
            </div>
          )}

          {/* Stats Footer */}
          {!loading && sortedData.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-400">
              <p>Showing {sortedData.length} players • Data refreshes automatically</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}