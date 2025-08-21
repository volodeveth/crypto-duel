import { sql } from '@vercel/postgres';

// Vercel Postgres-based database functions for Farcaster notifications
// Replaces SQLite to enable cloud storage and sync between local/production

// Initialize tables
export async function initializeTables() {
  try {
    // Create farcaster_users table
    await sql`
      CREATE TABLE IF NOT EXISTS farcaster_users (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE,
        fid INTEGER,
        username TEXT,
        notification_url TEXT,
        notification_token TEXT,
        notifications_enabled BOOLEAN DEFAULT TRUE,
        br_notifications BOOLEAN DEFAULT TRUE,
        last_notification_sent TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create battle_royales table
    await sql`
      CREATE TABLE IF NOT EXISTS battle_royales (
        id SERIAL PRIMARY KEY,
        battle_id INTEGER NOT NULL UNIQUE,
        mode TEXT NOT NULL CHECK(mode IN ('BR5', 'BR100', 'BR1000')),
        bet_amount TEXT NOT NULL,
        players_count INTEGER NOT NULL,
        winner_address TEXT,
        total_prize TEXT NOT NULL,
        start_time BIGINT NOT NULL,
        end_time BIGINT,
        random_seed TEXT,
        completed BOOLEAN DEFAULT FALSE,
        tx_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create br_participants table
    await sql`
      CREATE TABLE IF NOT EXISTS br_participants (
        id SERIAL PRIMARY KEY,
        battle_royale_id INTEGER NOT NULL,
        player_address TEXT NOT NULL,
        join_time BIGINT NOT NULL,
        is_winner BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (battle_royale_id) REFERENCES battle_royales (id),
        UNIQUE(battle_royale_id, player_address)
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_battle_royales_mode ON battle_royales(mode)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_battle_royales_winner ON battle_royales(winner_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_br_participants_player ON br_participants(player_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_br_participants_battle ON br_participants(battle_royale_id)`;

    console.log('✅ Postgres tables initialized');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to initialize tables:', error);
    throw error;
  }
}

// User management functions
export async function upsertUser(userData) {
  try {
    await initializeTables(); // Ensure tables exist

    const result = await sql`
      INSERT INTO farcaster_users (
        wallet_address, fid, username, notification_url, notification_token, notifications_enabled, updated_at
      ) VALUES (
        ${userData.wallet_address?.toLowerCase()}, 
        ${userData.fid}, 
        ${userData.username}, 
        ${userData.notification_url}, 
        ${userData.notification_token}, 
        ${userData.notifications_enabled !== undefined ? userData.notifications_enabled : true},
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (wallet_address) DO UPDATE SET
        fid = EXCLUDED.fid,
        username = EXCLUDED.username,
        notification_url = COALESCE(EXCLUDED.notification_url, farcaster_users.notification_url),
        notification_token = COALESCE(EXCLUDED.notification_token, farcaster_users.notification_token),
        notifications_enabled = COALESCE(EXCLUDED.notifications_enabled, farcaster_users.notifications_enabled),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    console.log('✅ User upserted to Postgres:', { fid: userData.fid, username: userData.username });
    return { success: true, fid: userData.fid, user: result.rows[0] };
  } catch (error) {
    console.error('❌ Failed to upsert user:', error);
    throw error;
  }
}

export async function getUserByFid(fid) {
  try {
    const result = await sql`SELECT * FROM farcaster_users WHERE fid = ${fid}`;
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Failed to get user by FID:', error);
    return null;
  }
}

export async function getUserByWallet(walletAddress) {
  try {
    const result = await sql`SELECT * FROM farcaster_users WHERE wallet_address = ${walletAddress.toLowerCase()}`;
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Failed to get user by wallet:', error);
    return null;
  }
}

// Alias for getUserByWallet (used in API endpoints)
export async function getUserByAddress(address) {
  return getUserByWallet(address);
}

export async function updateUser(fid, updates) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);
    
    const result = await sql.query(
      `UPDATE farcaster_users SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE fid = $1 RETURNING *`,
      [fid, ...values]
    );
    
    console.log('✅ User updated in Postgres:', { fid, updates: Object.keys(updates) });
    return { success: true, user: result.rows[0] };
  } catch (error) {
    console.error('❌ Failed to update user:', error);
    throw error;
  }
}

export async function getUsersWithNotificationsEnabled() {
  try {
    const result = await sql`
      SELECT * FROM farcaster_users 
      WHERE notifications_enabled = TRUE 
      AND notification_url IS NOT NULL 
      AND notification_token IS NOT NULL
    `;
    
    console.log(`📊 Found ${result.rows.length} users with notifications enabled`);
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get users with notifications:', error);
    return [];
  }
}

export async function getAllUsers() {
  try {
    const result = await sql`SELECT * FROM farcaster_users ORDER BY created_at DESC`;
    
    console.log(`📊 Total users in Postgres: ${result.rows.length}`);
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get all users:', error);
    return [];
  }
}

// Battle Royale functions
export async function createBattleRoyale(battleData) {
  try {
    const result = await sql`
      INSERT INTO battle_royales (
        battle_id, mode, bet_amount, players_count, winner_address, 
        total_prize, start_time, end_time, random_seed, completed, tx_hash
      ) VALUES (
        ${battleData.battle_id}, ${battleData.mode}, ${battleData.bet_amount}, 
        ${battleData.players_count}, ${battleData.winner_address}, ${battleData.total_prize}, 
        ${battleData.start_time}, ${battleData.end_time || null}, 
        ${battleData.random_seed || null}, ${battleData.completed || false}, 
        ${battleData.tx_hash || null}
      )
      RETURNING *
    `;

    console.log('✅ Battle Royale created in Postgres:', battleData.battle_id);
    return { success: true, battle: result.rows[0] };
  } catch (error) {
    console.error('❌ Failed to create battle royale:', error);
    throw error;
  }
}

export async function getBattleRoyaleById(battleId) {
  try {
    const result = await sql`SELECT * FROM battle_royales WHERE battle_id = ${battleId}`;
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Failed to get battle royale:', error);
    return null;
  }
}

export async function updateBattleRoyale(battleId, updates) {
  try {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = Object.values(updates);
    
    const result = await sql.query(
      `UPDATE battle_royales SET ${setClause} WHERE battle_id = $1 RETURNING *`,
      [battleId, ...values]
    );
    
    console.log('✅ Battle Royale updated in Postgres:', { battleId, updates: Object.keys(updates) });
    return { success: true, battle: result.rows[0] };
  } catch (error) {
    console.error('❌ Failed to update battle royale:', error);
    throw error;
  }
}

export async function addBRParticipant(battleRoyaleId, playerAddress, joinTime, isWinner = false) {
  try {
    const result = await sql`
      INSERT INTO br_participants (battle_royale_id, player_address, join_time, is_winner)
      VALUES (${battleRoyaleId}, ${playerAddress.toLowerCase()}, ${joinTime}, ${isWinner})
      ON CONFLICT (battle_royale_id, player_address) DO NOTHING
      RETURNING *
    `;

    console.log('✅ BR Participant added to Postgres:', { battleRoyaleId, playerAddress });
    return { success: true, participant: result.rows[0] };
  } catch (error) {
    console.error('❌ Failed to add BR participant:', error);
    throw error;
  }
}

export async function getBRParticipants(battleRoyaleId) {
  try {
    const result = await sql`
      SELECT * FROM br_participants 
      WHERE battle_royale_id = ${battleRoyaleId}
      ORDER BY join_time ASC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get BR participants:', error);
    return [];
  }
}

export async function getPlayerBattleRoyales(playerAddress) {
  try {
    const result = await sql`
      SELECT br.*, p.is_winner, p.join_time as participant_join_time
      FROM battle_royales br
      JOIN br_participants p ON br.id = p.battle_royale_id
      WHERE p.player_address = ${playerAddress.toLowerCase()}
      ORDER BY br.start_time DESC
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get player battle royales:', error);
    return [];
  }
}

export async function getBattleRoyalesByMode(mode, limit = 50) {
  try {
    const result = await sql`
      SELECT * FROM battle_royales 
      WHERE mode = ${mode}
      ORDER BY start_time DESC 
      LIMIT ${limit}
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get battles by mode:', error);
    return [];
  }
}

export async function getRecentBattleRoyales(limit = 50) {
  try {
    const result = await sql`
      SELECT * FROM battle_royales 
      ORDER BY start_time DESC 
      LIMIT ${limit}
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get recent battles:', error);
    return [];
  }
}

export async function getBRStatsForPlayer(playerAddress) {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_battles,
        SUM(CASE WHEN p.is_winner = true THEN 1 ELSE 0 END) as wins,
        br.mode,
        COUNT(*) as battles_in_mode
      FROM battle_royales br
      JOIN br_participants p ON br.id = p.battle_royale_id
      WHERE p.player_address = ${playerAddress.toLowerCase()}
      GROUP BY br.mode
    `;
    
    return result.rows;
  } catch (error) {
    console.error('❌ Failed to get BR stats for player:', error);
    return [];
  }
}

export async function getUsersWithBRNotificationsEnabled() {
  try {
    const result = await sql`
      SELECT * FROM farcaster_users 
      WHERE notifications_enabled = TRUE 
      AND br_notifications = TRUE
      AND notification_url IS NOT NULL 
      AND notification_token IS NOT NULL
    `;
    
    console.log(`📊 Found ${result.rows.length} users with BR notifications enabled`);
    return result.rows;
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
  getUsersWithBRNotificationsEnabled,
  // Utility
  initializeTables
};