import { kv } from '@vercel/kv';

// Vercel KV-based database functions for Farcaster notifications
// Replaces SQLite to enable cloud storage and sync between local/production

// User management functions
export async function upsertUser(userData) {
  try {
    const userId = `user:${userData.fid}`;
    const user = {
      fid: userData.fid,
      username: userData.username,
      wallet_address: userData.wallet_address?.toLowerCase(),
      notification_url: userData.notification_url,
      notification_token: userData.notification_token,
      notifications_enabled: userData.notifications_enabled !== undefined ? userData.notifications_enabled : true,
      br_notifications: userData.br_notifications !== undefined ? userData.br_notifications : true,
      last_notification_sent: userData.last_notification_sent,
      created_at: userData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.hset(userId, user);
    
    // Index by wallet address if provided
    if (userData.wallet_address) {
      await kv.set(`wallet:${userData.wallet_address.toLowerCase()}`, userData.fid);
    }

    console.log('✅ User upserted to KV:', { fid: userData.fid, username: userData.username });
    return { success: true, fid: userData.fid };
  } catch (error) {
    console.error('❌ Failed to upsert user:', error);
    throw error;
  }
}

export async function getUserByFid(fid) {
  try {
    const user = await kv.hgetall(`user:${fid}`);
    return user && Object.keys(user).length > 0 ? user : null;
  } catch (error) {
    console.error('❌ Failed to get user by FID:', error);
    return null;
  }
}

export async function getUserByWallet(walletAddress) {
  try {
    const fid = await kv.get(`wallet:${walletAddress.toLowerCase()}`);
    if (!fid) return null;
    
    return await getUserByFid(fid);
  } catch (error) {
    console.error('❌ Failed to get user by wallet:', error);
    return null;
  }
}

export async function updateUser(fid, updates) {
  try {
    const userId = `user:${fid}`;
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.hset(userId, updatesWithTimestamp);
    console.log('✅ User updated in KV:', { fid, updates: Object.keys(updates) });
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update user:', error);
    throw error;
  }
}

export async function getUsersWithNotificationsEnabled() {
  try {
    // Get all user keys
    const userKeys = await kv.keys('user:*');
    const users = [];
    
    for (const key of userKeys) {
      const user = await kv.hgetall(key);
      if (user && 
          user.notifications_enabled === 'true' && 
          user.notification_url && 
          user.notification_token) {
        users.push(user);
      }
    }
    
    console.log(`📊 Found ${users.length} users with notifications enabled`);
    return users;
  } catch (error) {
    console.error('❌ Failed to get users with notifications:', error);
    return [];
  }
}

export async function getAllUsers() {
  try {
    const userKeys = await kv.keys('user:*');
    const users = [];
    
    for (const key of userKeys) {
      const user = await kv.hgetall(key);
      if (user && Object.keys(user).length > 0) {
        users.push(user);
      }
    }
    
    console.log(`📊 Total users in KV: ${users.length}`);
    return users;
  } catch (error) {
    console.error('❌ Failed to get all users:', error);
    return [];
  }
}

// Battle Royale functions
export async function createBattleRoyale(battleData) {
  try {
    const battleId = `battle:${battleData.battle_id}`;
    const battle = {
      battle_id: battleData.battle_id,
      mode: battleData.mode,
      bet_amount: battleData.bet_amount,
      players_count: battleData.players_count,
      winner_address: battleData.winner_address,
      total_prize: battleData.total_prize,
      start_time: battleData.start_time,
      end_time: battleData.end_time || null,
      random_seed: battleData.random_seed || null,
      completed: battleData.completed || false,
      tx_hash: battleData.tx_hash || null,
      created_at: new Date().toISOString()
    };

    await kv.hset(battleId, battle);
    
    // Add to mode index
    await kv.sadd(`battles:${battleData.mode}`, battleData.battle_id);
    
    console.log('✅ Battle Royale created in KV:', battleData.battle_id);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to create battle royale:', error);
    throw error;
  }
}

export async function getBattleRoyaleById(battleId) {
  try {
    const battle = await kv.hgetall(`battle:${battleId}`);
    return battle && Object.keys(battle).length > 0 ? battle : null;
  } catch (error) {
    console.error('❌ Failed to get battle royale:', error);
    return null;
  }
}

export async function updateBattleRoyale(battleId, updates) {
  try {
    const battleKey = `battle:${battleId}`;
    const updatesWithTimestamp = {
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    await kv.hset(battleKey, updatesWithTimestamp);
    console.log('✅ Battle Royale updated in KV:', { battleId, updates: Object.keys(updates) });
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update battle royale:', error);
    throw error;
  }
}

export async function addBRParticipant(battleRoyaleId, playerAddress, joinTime, isWinner = false) {
  try {
    const participantKey = `participant:${battleRoyaleId}:${playerAddress.toLowerCase()}`;
    const participant = {
      battle_royale_id: battleRoyaleId,
      player_address: playerAddress.toLowerCase(),
      join_time: joinTime,
      is_winner: isWinner,
      created_at: new Date().toISOString()
    };

    await kv.hset(participantKey, participant);
    
    // Add to battle participants set
    await kv.sadd(`battle:${battleRoyaleId}:participants`, playerAddress.toLowerCase());
    
    // Add to player's battles set
    await kv.sadd(`player:${playerAddress.toLowerCase()}:battles`, battleRoyaleId);
    
    console.log('✅ BR Participant added to KV:', { battleRoyaleId, playerAddress });
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to add BR participant:', error);
    throw error;
  }
}

export async function getBRParticipants(battleRoyaleId) {
  try {
    const participantAddresses = await kv.smembers(`battle:${battleRoyaleId}:participants`);
    const participants = [];
    
    for (const address of participantAddresses) {
      const participant = await kv.hgetall(`participant:${battleRoyaleId}:${address}`);
      if (participant && Object.keys(participant).length > 0) {
        participants.push(participant);
      }
    }
    
    // Sort by join_time
    participants.sort((a, b) => parseInt(a.join_time) - parseInt(b.join_time));
    
    return participants;
  } catch (error) {
    console.error('❌ Failed to get BR participants:', error);
    return [];
  }
}

export async function getPlayerBattleRoyales(playerAddress) {
  try {
    const battleIds = await kv.smembers(`player:${playerAddress.toLowerCase()}:battles`);
    const battles = [];
    
    for (const battleId of battleIds) {
      const battle = await getBattleRoyaleById(battleId);
      if (battle) {
        // Get participant info
        const participant = await kv.hgetall(`participant:${battleId}:${playerAddress.toLowerCase()}`);
        if (participant) {
          battle.is_winner = participant.is_winner;
          battle.participant_join_time = participant.join_time;
        }
        battles.push(battle);
      }
    }
    
    // Sort by start_time descending
    battles.sort((a, b) => parseInt(b.start_time) - parseInt(a.start_time));
    
    return battles;
  } catch (error) {
    console.error('❌ Failed to get player battle royales:', error);
    return [];
  }
}

export async function getBattleRoyalesByMode(mode, limit = 50) {
  try {
    const battleIds = await kv.smembers(`battles:${mode}`);
    const battles = [];
    
    for (const battleId of battleIds.slice(0, limit)) {
      const battle = await getBattleRoyaleById(battleId);
      if (battle) {
        battles.push(battle);
      }
    }
    
    // Sort by start_time descending
    battles.sort((a, b) => parseInt(b.start_time) - parseInt(a.start_time));
    
    return battles.slice(0, limit);
  } catch (error) {
    console.error('❌ Failed to get battles by mode:', error);
    return [];
  }
}

export async function getRecentBattleRoyales(limit = 50) {
  try {
    const battleKeys = await kv.keys('battle:*');
    const battles = [];
    
    for (const key of battleKeys) {
      if (!key.includes(':participants')) { // Skip participant keys
        const battle = await kv.hgetall(key);
        if (battle && Object.keys(battle).length > 0) {
          battles.push(battle);
        }
      }
    }
    
    // Sort by start_time descending
    battles.sort((a, b) => parseInt(b.start_time) - parseInt(a.start_time));
    
    return battles.slice(0, limit);
  } catch (error) {
    console.error('❌ Failed to get recent battles:', error);
    return [];
  }
}

export async function getBRStatsForPlayer(playerAddress) {
  try {
    const battleIds = await kv.smembers(`player:${playerAddress.toLowerCase()}:battles`);
    const stats = {};
    
    for (const battleId of battleIds) {
      const battle = await getBattleRoyaleById(battleId);
      const participant = await kv.hgetall(`participant:${battleId}:${playerAddress.toLowerCase()}`);
      
      if (battle && participant) {
        const mode = battle.mode;
        if (!stats[mode]) {
          stats[mode] = {
            mode,
            total_battles: 0,
            wins: 0,
            battles_in_mode: 0
          };
        }
        
        stats[mode].total_battles++;
        stats[mode].battles_in_mode++;
        if (participant.is_winner === 'true' || participant.is_winner === true) {
          stats[mode].wins++;
        }
      }
    }
    
    return Object.values(stats);
  } catch (error) {
    console.error('❌ Failed to get BR stats for player:', error);
    return [];
  }
}

export async function getUsersWithBRNotificationsEnabled() {
  try {
    const userKeys = await kv.keys('user:*');
    const users = [];
    
    for (const key of userKeys) {
      const user = await kv.hgetall(key);
      if (user && 
          user.notifications_enabled === 'true' && 
          user.br_notifications === 'true' &&
          user.notification_url && 
          user.notification_token) {
        users.push(user);
      }
    }
    
    console.log(`📊 Found ${users.length} users with BR notifications enabled`);
    return users;
  } catch (error) {
    console.error('❌ Failed to get users with BR notifications:', error);
    return [];
  }
}

// Export default object for backward compatibility
export default {
  upsertUser,
  getUserByWallet,
  getUserByFid,
  updateUser,
  getUsersWithNotificationsEnabled,
  getAllUsers,
  // Battle Royale functions
  createBattleRoyale,
  getBattleRoyaleById,
  updateBattleRoyale,
  addBRParticipant,
  getBRParticipants,
  getPlayerBattleRoyales,
  getBattleRoyalesByMode,
  getRecentBattleRoyales,
  getBRStatsForPlayer,
  getUsersWithBRNotificationsEnabled
};