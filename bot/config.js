// config.js
require('dotenv').config();

module.exports = {
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY, // ✅ ENV DAN OLINADI
  ADMIN_IDS: process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [],
  
  validateConfig: function() {
    if (!this.TELEGRAM_BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
    if (!this.YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not set');
  }
};
