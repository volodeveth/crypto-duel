import { 
  getPlayerBattleRoyales, 
  getBRStatsForPlayer 
} from '../../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;
    
    if (!address) {
      return res.status(400).json({ error: 'Address parameter required' });
    }

    // Get player's battle royale history
    const battles = getPlayerBattleRoyales(address);
    
    // Get player's battle royale statistics
    const stats = getBRStatsForPlayer(address);
    
    // Process stats into a more usable format
    const processedStats = {
      total_battles: 0,
      total_wins: 0,
      by_mode: {}
    };
    
    stats.forEach(stat => {
      processedStats.total_battles += stat.battles_in_mode;
      processedStats.total_wins += stat.wins;
      processedStats.by_mode[stat.mode] = {
        battles: stat.battles_in_mode,
        wins: stat.wins,
        win_rate: stat.battles_in_mode > 0 ? (stat.wins / stat.battles_in_mode * 100).toFixed(1) : '0.0'
      };
    });
    
    processedStats.overall_win_rate = processedStats.total_battles > 0 
      ? (processedStats.total_wins / processedStats.total_battles * 100).toFixed(1) 
      : '0.0';

    return res.status(200).json({
      success: true,
      battles: battles,
      stats: processedStats
    });

  } catch (error) {
    console.error('Error fetching player battle royale history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}