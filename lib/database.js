import Database from 'better-sqlite3';
import path from 'path';

let db = null;

function getDatabase() {
  if (db) return db;
  
  const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'notifications.db');
  db = new Database(dbPath);
  
  // Create tables if they don't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS farcaster_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_address TEXT UNIQUE,
      fid INTEGER,
      username TEXT,
      notification_url TEXT,
      notification_token TEXT,
      notifications_enabled BOOLEAN DEFAULT TRUE,
      br_notifications BOOLEAN DEFAULT TRUE,
      last_notification_sent DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS battle_royales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      battle_id INTEGER NOT NULL UNIQUE,
      mode TEXT NOT NULL CHECK(mode IN ('BR5', 'BR100', 'BR1000')),
      bet_amount TEXT NOT NULL,
      players_count INTEGER NOT NULL,
      winner_address TEXT,
      total_prize TEXT NOT NULL,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      random_seed TEXT,
      completed BOOLEAN DEFAULT FALSE,
      tx_hash TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE IF NOT EXISTS br_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      battle_royale_id INTEGER NOT NULL,
      player_address TEXT NOT NULL,
      join_time INTEGER NOT NULL,
      is_winner BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (battle_royale_id) REFERENCES battle_royales (id),
      UNIQUE(battle_royale_id, player_address)
    );
    
    CREATE INDEX IF NOT EXISTS idx_battle_royales_mode ON battle_royales(mode);
    CREATE INDEX IF NOT EXISTS idx_battle_royales_winner ON battle_royales(winner_address);
    CREATE INDEX IF NOT EXISTS idx_br_participants_player ON br_participants(player_address);
    CREATE INDEX IF NOT EXISTS idx_br_participants_battle ON br_participants(battle_royale_id);
  `);
  
  return db;
}

export function upsertUser(userData) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO farcaster_users (
      wallet_address, fid, username, notification_url, notification_token, notifications_enabled
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(wallet_address) DO UPDATE SET
      fid = excluded.fid,
      username = excluded.username,
      notification_url = COALESCE(excluded.notification_url, notification_url),
      notification_token = COALESCE(excluded.notification_token, notification_token),
      notifications_enabled = COALESCE(excluded.notifications_enabled, notifications_enabled)
  `);
  
  return stmt.run(
    userData.wallet_address?.toLowerCase(),
    userData.fid,
    userData.username,
    userData.notification_url,
    userData.notification_token,
    userData.notifications_enabled !== undefined ? userData.notifications_enabled : true
  );
}

export function getUserByWallet(walletAddress) {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM farcaster_users WHERE wallet_address = ?');
  return stmt.get(walletAddress.toLowerCase());
}

export function getUserByFid(fid) {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM farcaster_users WHERE fid = ?');
  return stmt.get(fid);
}

export function updateUser(fid, updates) {
  const database = getDatabase();
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(fid);
  
  const stmt = database.prepare(`UPDATE farcaster_users SET ${fields} WHERE fid = ?`);
  return stmt.run(...values);
}

export function getUsersWithNotificationsEnabled() {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM farcaster_users 
    WHERE notifications_enabled = TRUE 
    AND notification_url IS NOT NULL 
    AND notification_token IS NOT NULL
  `);
  return stmt.all();
}

export function getAllUsers() {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM farcaster_users');
  return stmt.all();
}

// Battle Royale functions
export function createBattleRoyale(battleData) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT INTO battle_royales (
      battle_id, mode, bet_amount, players_count, winner_address, 
      total_prize, start_time, end_time, random_seed, completed, tx_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    battleData.battle_id,
    battleData.mode,
    battleData.bet_amount,
    battleData.players_count,
    battleData.winner_address,
    battleData.total_prize,
    battleData.start_time,
    battleData.end_time || null,
    battleData.random_seed || null,
    battleData.completed || false,
    battleData.tx_hash || null
  );
}

export function getBattleRoyaleById(battleId) {
  const database = getDatabase();
  const stmt = database.prepare('SELECT * FROM battle_royales WHERE battle_id = ?');
  return stmt.get(battleId);
}

export function updateBattleRoyale(battleId, updates) {
  const database = getDatabase();
  const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(battleId);
  
  const stmt = database.prepare(`UPDATE battle_royales SET ${fields} WHERE battle_id = ?`);
  return stmt.run(...values);
}

export function addBRParticipant(battleRoyaleId, playerAddress, joinTime, isWinner = false) {
  const database = getDatabase();
  const stmt = database.prepare(`
    INSERT OR IGNORE INTO br_participants (battle_royale_id, player_address, join_time, is_winner)
    VALUES (?, ?, ?, ?)
  `);
  
  return stmt.run(battleRoyaleId, playerAddress.toLowerCase(), joinTime, isWinner);
}

export function getBRParticipants(battleRoyaleId) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM br_participants 
    WHERE battle_royale_id = ? 
    ORDER BY join_time ASC
  `);
  return stmt.all(battleRoyaleId);
}

export function getPlayerBattleRoyales(playerAddress) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT br.*, p.is_winner, p.join_time as participant_join_time
    FROM battle_royales br
    JOIN br_participants p ON br.id = p.battle_royale_id
    WHERE p.player_address = ?
    ORDER BY br.start_time DESC
  `);
  return stmt.all(playerAddress.toLowerCase());
}

export function getBattleRoyalesByMode(mode, limit = 50) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM battle_royales 
    WHERE mode = ? 
    ORDER BY start_time DESC 
    LIMIT ?
  `);
  return stmt.all(mode, limit);
}

export function getRecentBattleRoyales(limit = 50) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM battle_royales 
    ORDER BY start_time DESC 
    LIMIT ?
  `);
  return stmt.all(limit);
}

export function getBRStatsForPlayer(playerAddress) {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT 
      COUNT(*) as total_battles,
      SUM(CASE WHEN p.is_winner = 1 THEN 1 ELSE 0 END) as wins,
      br.mode,
      COUNT(*) as battles_in_mode
    FROM battle_royales br
    JOIN br_participants p ON br.id = p.battle_royale_id
    WHERE p.player_address = ?
    GROUP BY br.mode
  `);
  return stmt.all(playerAddress.toLowerCase());
}

export function getUsersWithBRNotificationsEnabled() {
  const database = getDatabase();
  const stmt = database.prepare(`
    SELECT * FROM farcaster_users 
    WHERE notifications_enabled = TRUE 
    AND br_notifications = TRUE
    AND notification_url IS NOT NULL 
    AND notification_token IS NOT NULL
  `);
  return stmt.all();
}

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