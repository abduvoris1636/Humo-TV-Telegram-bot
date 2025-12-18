// bot/config.js
/**
 * Configuration file for Humo TV Bot
 * All sensitive data loaded from environment variables
 */

require('dotenv').config();

module.exports = {
  // Telegram Bot Token (MUST be set in environment variables)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  
  // YouTube Data API Key (MUST be set in environment variables)
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  
  // Database configuration
  DATABASE_PATH: process.env.DATABASE_PATH || './database.sqlite',
  
  // Bot configuration
  BOT_USERNAME: process.env.BOT_USERNAME || 'HumoTVBot',
  
  // Check intervals (in milliseconds)
  CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL) || 60000, // 1 minute
  
  // Default footer branding (for free users)
  DEFAULT_FOOTER: `⚡️ Powered by "For Humo: Humo TV"
🔹 For Humo TG kanal: https://t.me/forhumo
🔹 Humo TV TG kanal: https://t.me/ForHumoTV
🌐 Rasmiy sayt: https://forhumo.uz`,
  
  // Plus plan pricing
  PLUS_PLAN_PRICE: 19990, // in so'm
  PLUS_PLAN_DAYS: 30, // subscription duration
  
  // Admin user IDs (comma separated)
  ADMIN_IDS: (process.env.ADMIN_IDS || '').split(',').map(id => parseInt(id.trim())).filter(id => id),
  
  // Validate required environment variables
  validateConfig: function() {
    const missing = [];
    if (!this.TELEGRAM_BOT_TOKEN) missing.push('TELEGRAM_BOT_TOKEN');
    if (!this.YOUTUBE_API_KEY) missing.push('YOUTUBE_API_KEY');
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
};
