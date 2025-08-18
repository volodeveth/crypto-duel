import { 
  createBattleRoyale, 
  updateBattleRoyale, 
  addBRParticipant, 
  getBattleRoyaleById 
} from '../../../lib/database.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { eventType, eventData } = req.body;

    if (eventType === 'BattleRoyaleStarted') {
      // Create new battle royale record
      const battleData = {
        battle_id: Number(eventData.battleId),
        mode: getModeString(Number(eventData.mode)),
        bet_amount: eventData.betAmount,
        players_count: Number(eventData.playersCount),
        winner_address: null,
        total_prize: eventData.totalPrize || '0',
        start_time: Date.now(),
        end_time: null,
        random_seed: null,
        completed: false,
        tx_hash: eventData.txHash || null
      };

      const result = createBattleRoyale(battleData);
      const battleRoyaleId = result.lastInsertRowid;

      // Add participants
      if (eventData.players && Array.isArray(eventData.players)) {
        for (const player of eventData.players) {
          addBRParticipant(battleRoyaleId, player, Date.now());
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Battle Royale created',
        battleRoyaleId: battleRoyaleId 
      });
    }

    if (eventType === 'BattleRoyaleCompleted') {
      const battleId = Number(eventData.battleId);
      const existingBattle = getBattleRoyaleById(battleId);
      
      if (!existingBattle) {
        return res.status(404).json({ error: 'Battle Royale not found' });
      }

      // Update battle royale with completion data
      const updates = {
        winner_address: eventData.winner,
        total_prize: eventData.prize,
        end_time: Date.now(),
        random_seed: eventData.randomSeed,
        completed: true,
        tx_hash: eventData.txHash || existingBattle.tx_hash
      };

      updateBattleRoyale(battleId, updates);

      // Update winner participant
      if (eventData.winner) {
        const database = require('../../../lib/database.js').default;
        const db = database.getDatabase();
        const stmt = db.prepare(`
          UPDATE br_participants 
          SET is_winner = 1 
          WHERE battle_royale_id = (SELECT id FROM battle_royales WHERE battle_id = ?) 
          AND player_address = ?
        `);
        stmt.run(battleId, eventData.winner.toLowerCase());
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Battle Royale completed' 
      });
    }

    return res.status(400).json({ error: 'Invalid event type' });

  } catch (error) {
    console.error('Error storing battle royale event:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function getModeString(modeNumber) {
  const modes = {
    1: 'BR5',
    2: 'BR100', 
    3: 'BR1000'
  };
  return modes[modeNumber] || 'UNKNOWN';
}