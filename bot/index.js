// index.js
const TelegramBot = require('node-telegram-bot-api');
const config = require('./bot/config');
const storage = require('./bot/storage');
const youtube = require('./bot/youtube');

// Faqat bitta bot instance
const bot = new TelegramBot(config.8504848437:AAFH4yzdrnPjjIZ2Bv2rnhMVupU5AmKPRVc, { polling: true });

async function startBot() {
  try {
    config.validateConfig();
    await storage.initDatabase();
    
    console.log('✅ Humo TV Bot ishga tushdi!');
    
    // Komandalarni sozlash
    bot.setMyCommands([
      { command: 'start', description: 'Botni boshlash' },
      { command: 'connect', description: 'Kanal ulash' },
      { command: 'help', description: 'Yordam' }
    ]);
    
    // Command handlers
    bot.onText(/\/start/, (msg) => handleStart(msg));
    bot.onText(/\/connect/, (msg) => handleConnect(msg));
    bot.onText(/\/help/, (msg) => handleHelp(msg));
    
  } catch (error) {
    console.error('❌ Botni ishga tushirishda xatolik:', error);
    process.exit(1);
  }
}

// ... qolgan handler funksiyalari

startBot();
