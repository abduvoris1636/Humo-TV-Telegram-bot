// bot/storage.js
/**
 * Database storage module using SQLite
 * Handles user data, channel connections, and subscription info
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

class Database {
  constructor() {
    this.db = new sqlite3.Database(config.DATABASE_PATH);
    this.initDatabase();
  }

  /**
   * Initialize database tables
   */
  initDatabase() {
    const queries = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id INTEGER UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        last_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Channels table
      `CREATE TABLE IF NOT EXISTS channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        channel_id TEXT UNIQUE NOT NULL,
        channel_title TEXT,
        youtube_channel_url TEXT NOT NULL,
        youtube_channel_id TEXT,
        last_video_id TEXT,
        last_live_status TEXT DEFAULT 'none',
        plan TEXT DEFAULT 'free',
        subscription_expiry DATETIME,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`,
      
      // Videos table (for tracking posted videos)
      `CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id INTEGER NOT NULL,
        youtube_video_id TEXT NOT NULL,
        title TEXT,
        type TEXT CHECK(type IN ('video', 'live', 'premier')),
        posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
        UNIQUE(channel_id, youtube_video_id)
      )`,
      
      // Payments table (abstract, no real payment processing)
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER,
        plan TEXT,
        payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        expiry_date DATETIME,
        status TEXT DEFAULT 'pending',
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      )`
    ];

    return new Promise((resolve, reject) => {
      let completed = 0;
      queries.forEach(query => {
        this.db.run(query, (err) => {
          if (err) reject(err);
          completed++;
          if (completed === queries.length) resolve();
        });
      });
    });
  }

  /**
   * Add or update user
   */
  async addUser(telegramId, username, firstName, lastName) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO users (telegram_id, username, first_name, last_name)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(telegram_id) DO UPDATE SET
         username = excluded.username,
         first_name = excluded.first_name,
         last_name = excluded.last_name`,
        [telegramId, username, firstName, lastName],
        function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Connect a channel for a user
   */
  async connectChannel(userId, channelId, channelTitle, youtubeUrl) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO channels (user_id, channel_id, channel_title, youtube_channel_url, is_active)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(channel_id) DO UPDATE SET
         user_id = excluded.user_id,
         channel_title = excluded.channel_title,
         youtube_channel_url = excluded.youtube_channel_url,
         is_active = 1`,
        [userId, channelId, channelTitle, youtubeUrl],
        function(err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });
  }

  /**
   * Get user by Telegram ID
   */
  async getUserByTelegramId(telegramId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE telegram_id = ?',
        [telegramId],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Get all active channels
   */
  async getActiveChannels() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT c.*, u.telegram_id as user_telegram_id 
         FROM channels c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.is_active = 1`,
        (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        }
      );
    });
  }

  /**
   * Update last video ID for a channel
   */
  async updateLastVideo(channelId, videoId, videoType = 'video') {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE channels SET last_video_id = ?, last_live_status = ? WHERE channel_id = ?`,
        [videoId, videoType, channelId],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Record a posted video
   */
  async recordPostedVideo(channelId, videoId, title, type) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO videos (channel_id, youtube_video_id, title, type) 
         VALUES ((SELECT id FROM channels WHERE channel_id = ?), ?, ?, ?)`,
        [channelId, videoId, title, type],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Check if video was already posted
   */
  async isVideoPosted(channelId, videoId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 1 FROM videos v 
         JOIN channels c ON v.channel_id = c.id 
         WHERE c.channel_id = ? AND v.youtube_video_id = ?`,
        [channelId, videoId],
        (err, row) => {
          if (err) reject(err);
          resolve(!!row);
        }
      );
    });
  }

  /**
   * Update user's subscription plan
   */
  async updateSubscription(telegramId, plan, expiryDate) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE channels SET plan = ?, subscription_expiry = ? 
         WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)`,
        [plan, expiryDate, telegramId],
        (err) => {
          if (err) reject(err);
          resolve();
        }
      );
    });
  }

  /**
   * Get channel by ID
   */
  async getChannelById(channelId) {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT c.*, u.telegram_id as user_telegram_id 
         FROM channels c 
         JOIN users u ON c.user_id = u.id 
         WHERE c.channel_id = ?`,
        [channelId],
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT c.id) as total_channels,
          SUM(CASE WHEN c.plan = 'plus' THEN 1 ELSE 0 END) as plus_users
         FROM users u
         LEFT JOIN channels c ON u.id = c.user_id`,
        (err, row) => {
          if (err) reject(err);
          resolve(row);
        }
      );
    });
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = new Database();
