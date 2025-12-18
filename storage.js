// storage.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config');

class Database {
    constructor() {
        this.db = new sqlite3.Database(config.DATABASE_FILE);
        this.init();
    }

    init() {
        // Users table
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE,
            username TEXT,
            first_name TEXT,
            last_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Channels table
        this.db.run(`CREATE TABLE IF NOT EXISTS channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            channel_id TEXT,
            channel_title TEXT,
            youtube_url TEXT,
            youtube_channel_id TEXT,
            last_video_id TEXT,
            plan TEXT DEFAULT 'free',
            expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            UNIQUE(user_id, channel_id)
        )`);

        // Videos table (for tracking posted videos)
        this.db.run(`CREATE TABLE IF NOT EXISTS videos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            channel_id INTEGER,
            video_id TEXT,
            title TEXT,
            type TEXT,
            posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (channel_id) REFERENCES channels(id),
            UNIQUE(channel_id, video_id)
        )`);
    }

    // User methods
    async saveUser(user) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO users (telegram_id, username, first_name, last_name) 
                 VALUES (?, ?, ?, ?)`,
                [user.telegram_id, user.username, user.first_name, user.last_name],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    // Channel methods
    async connectChannel(data) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR REPLACE INTO channels (user_id, channel_id, channel_title, is_active) 
                 VALUES ((SELECT id FROM users WHERE telegram_id = ?), ?, ?, 1)`,
                [data.user_id, data.channel_id, data.channel_title],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    async setYouTubeChannel(data) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE channels SET 
                 youtube_url = ?, 
                 youtube_channel_id = ?,
                 channel_title = COALESCE(?, channel_title)
                 WHERE user_id = (SELECT id FROM users WHERE telegram_id = ?)`,
                [data.youtube_url, data.youtube_channel_id, data.channel_title, data.user_id],
                function(err) {
                    if (err) reject(err);
                    resolve(this.changes);
                }
            );
        });
    }

    async getUserChannel(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT c.* FROM channels c
                 JOIN users u ON c.user_id = u.id
                 WHERE u.telegram_id = ? AND c.is_active = 1`,
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row || null);
                }
            );
        });
    }

    async getAllActiveChannels() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT c.*, u.telegram_id as user_telegram_id 
                 FROM channels c
                 JOIN users u ON c.user_id = u.id
                 WHERE c.is_active = 1 AND c.youtube_channel_id IS NOT NULL`,
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows || []);
                }
            );
        });
    }

    async updateLastVideo(channelId, videoId) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE channels SET last_video_id = ? WHERE id = ?`,
                [videoId, channelId],
                (err) => {
                    if (err) reject(err);
                    resolve();
                }
            );
        });
    }

    async savePostedVideo(channelId, video) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO videos (channel_id, video_id, title, type) 
                 VALUES (?, ?, ?, ?)`,
                [channelId, video.id, video.title, video.type],
                (err) => {
                    if (err) reject(err);
                    resolve();
                }
            );
        });
    }

    async isVideoPosted(channelId, videoId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                `SELECT 1 FROM videos WHERE channel_id = ? AND video_id = ?`,
                [channelId, videoId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(!!row);
                }
            );
        });
    }

    // Statistics
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
                    resolve(row || { total_users: 0, total_channels: 0, plus_users: 0 });
                }
            );
        });
    }
}

module.exports = new Database();
