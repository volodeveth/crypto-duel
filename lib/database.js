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
      last_notification_sent DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
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

export default {
  upsertUser,
  getUserByWallet,
  getUserByFid,
  updateUser,
  getUsersWithNotificationsEnabled,
  getAllUsers
};