require('dotenv').config();

const config = {
  // Telegram Bot Token (@BotFather dan)
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  
  // YouTube Data API v3 Key
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
  
  // Admin Telegram IDs
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [],
  
  // Database
  DB_PATH: process.env.DB_PATH || './database.sqlite',
  
  // Check interval (5 minutes)
  CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL) || 300000,
  
  // Footer for free users
  DEFAULT_FOOTER: `⚡️ Powered by "For Humo: Humo TV"
🔹 For Humo TG kanal: https://t.me/forhumo
🔹 Humo TV TG kanal: https://t.me/ForHumoTV
🌐 Rasmiy sayt: https://forhumo.uz`,
  
  // Plus plan
  PLUS_PLAN_PRICE: 19990,
  PLUS_PLAN_DAYS: 30,
  
  // Validate configuration
  validate() {
    const errors = [];
    if (!this.TELEGRAM_BOT_TOKEN) errors.push('TELEGRAM_BOT_TOKEN not set');
    if (!this.YOUTUBE_API_KEY) errors.push('YOUTUBE_API_KEY not set');
    
    if (errors.length > 0) {
      throw new Error(`Config validation failed: ${errors.join(', ')}`);
    }
  }
};

module.exports = config;
