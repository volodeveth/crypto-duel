import { 
  getRecentBattleRoyales, 
  getBattleRoyalesByMode,
  getBRParticipants 
} from '../../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { mode, limit = 20, include_participants = false } = req.query;
    
    let battles;
    
    if (mode && mode !== 'all') {
      battles = getBattleRoyalesByMode(mode.toUpperCase(), Number(limit));
    } else {
      battles = getRecentBattleRoyales(Number(limit));
    }

    // Include participants if requested
    if (include_participants === 'true') {
      battles = battles.map(battle => {
        const participants = getBRParticipants(battle.id);
        return {
          ...battle,
          participants: participants
        };
      });
    }

    return res.status(200).json({
      success: true,
      battles: battles,
      count: battles.length
    });

  } catch (error) {
    console.error('Error fetching battle royales:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}