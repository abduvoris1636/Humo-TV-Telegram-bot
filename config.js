// config.js
require('dotenv').config();

module.exports = {
    // Telegram Bot Token
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN || "YOUR_TELEGRAM_BOT_TOKEN",
    
    // YouTube API Key
    YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || "AIzaSyBeESX2fWlgF84CEu03J38D-0ONVD7gAJU",
    
    // Admin Telegram IDs
    ADMINS: process.env.ADMINS ? process.env.ADMINS.split(',').map(id => parseInt(id.trim())) : [123456789],
    
    // Database file
    DATABASE_FILE: process.env.DATABASE_FILE || './humo.db',
    
    // Bot username
    BOT_USERNAME: process.env.BOT_USERNAME || 'HumoTVBot',
    
    // Check interval (5 minutes)
    CHECK_INTERVAL: parseInt(process.env.CHECK_INTERVAL) || 5 * 60 * 1000,
    
    // Free plan footer
    FREE_PLAN_FOOTER: `⚡️ Powered by "For Humo: Humo TV"
🔹 For Humo TG kanal: https://t.me/forhumo
🔹 Humo TV TG kanal: https://t.me/ForHumoTV
🌐 Rasmiy sayt: https://forhumo.uz`,
    
    // Plus plan price
    PLUS_PLAN_PRICE: 19990,
    PLUS_PLAN_DAYS: 30,
    
    // Validate config
    validate() {
        if (!this.TELEGRAM_TOKEN || this.TELEGRAM_TOKEN === "YOUR_TELEGRAM_BOT_TOKEN") {
            console.warn('⚠️  TELEGRAM_TOKEN not set in .env file');
        }
        
        if (!this.YOUTUBE_API_KEY || this.YOUTUBE_API_KEY === "YOUR_YOUTUBE_API_KEY") {
            console.warn('⚠️  YOUTUBE_API_KEY not set in .env file');
        }
        
        return true;
    }
};
