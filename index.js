// bot/index.js - Vercel uchun Webhook versiyasi
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const config = require('./config');
const storage = require('./storage');
const scheduler = require('./scheduler');

const app = express();
app.use(express.json());

console.log('🚀 Humo TV Bot Vercelda ishga tushmoqda...');

// Konfiguratsiyani tekshirish
if (!config.validate()) {
    console.error('❌ Botni ishga tushirish mumkin emas');
    process.exit(1);
}

// Vercel environment
const PORT = process.env.PORT || 3000;
const VERCEL_URL = process.env.VERCEL_URL || 'https://your-app.vercel.app';

// Botni webhook mode da yaratish
const bot = new TelegramBot(config.TELEGRAM_TOKEN);
bot.setWebHook(`${VERCEL_URL}/bot${config.TELEGRAM_TOKEN}`);

console.log(`✅ Webhook sozlandi: ${VERCEL_URL}`);

// Bot commands sozlash
const setupCommands = async () => {
    const commands = [
        { command: 'start', description: 'Botni boshlash' },
        { command: 'connect', description: 'Telegram kanal ulash' },
        { command: 'setyoutube', description: 'YouTube kanal manzili' },
        { command: 'preview', description: 'Post ko\'rinishini ko\'rish' },
        { command: 'help', description: 'Yordam va qo\'llanma' },
        { command: 'mystatus', description: 'Mening holatim' },
        { command: 'admin', description: 'Admin panel' }
    ];
    
    await bot.setMyCommands(commands);
    console.log('✅ Bot commands sozlandi');
};

// Start komandasi
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    
    console.log(`👤 Yangi foydalanuvchi: ${user.first_name} (@${user.username})`);
    
    try {
        await storage.saveUser({
            telegram_id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        });
    } catch (error) {
        console.error('❌ Foydalanuvchini saqlashda xatolik:', error);
    }
    
    const welcomeText = `🎉 *Assalomu alaykum, ${user.first_name || 'Foydalanuvchi'}!*\n\n` +
        `*Humo TV Bot* Vercelda ishlamoqda! 🚀\n\n` +
        `📺 *Botning vazifasi:*\n` +
        `• YouTube kanalingizdagi yangi videolar\n` +
        `• Jonli efirlar\n` +
        `• Telegram kanalingizga AVTOMATIK e'lon qilish\n\n` +
        `⚡️ *Qonuniylik:*\n` +
        `✅ Faqat matn va havolalar\n` +
        `✅ Videolarni YUKLAMAYDI\n` +
        `✅ Muallif huquqiga HURMAT\n\n` +
        `📋 *Boshlash uchun:*\n` +
        `/connect - Telegram kanal ulash\n` +
        `/setyoutube - YouTube kanal sozlash\n` +
        `/preview - Post ko'rinishini ko'rish\n\n` +
        `🌐 *Host:* Vercel\n` +
        `⚡️ *Status:* Online ✅`;
    
    bot.sendMessage(chatId, welcomeText, { 
        parse_mode: 'Markdown',
        disable_web_page_preview: true 
    });
});

// ... (qolgan komanda handerlari o'zgarishsiz, oldingi kod kabi)

// Vercel webhook endpoint
app.post(`/bot${config.TELEGRAM_TOKEN}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        service: 'Humo TV Bot',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Botni ishga tushirish
const startBot = async () => {
    try {
        await setupCommands();
        await storage.initDatabase();
        
        // Scheduler ni ishga tushirish
        scheduler.start(bot);
        
        console.log('🎉 Humo TV Bot Vercelda muvaffaqiyatli ishga tushdi!');
        console.log(`🌐 URL: ${VERCEL_URL}`);
        console.log(`🤖 Bot: @${config.BOT_USERNAME}`);
        
        // Serverni ishga tushirish
        app.listen(PORT, () => {
            console.log(`✅ Server ${PORT} portda ishlamoqda`);
        });
        
    } catch (error) {
        console.error('❌ Botni ishga tushirishda xatolik:', error);
        process.exit(1);
    }
};

// Export Vercel serverless function uchun
module.exports = app;

// Agar direct run qilinsa
if (require.main === module) {
    startBot();
}
