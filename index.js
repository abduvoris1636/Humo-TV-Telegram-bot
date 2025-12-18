// index.js - ASOSIY FAYL
const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const storage = require('./storage');
const scheduler = require('./scheduler');

console.log('🚀 Humo TV Bot ishga tushmoqda...');

// Botni yaratish
const bot = new TelegramBot(config.TELEGRAM_TOKEN, {
    polling: true,
    filepath: false
});

// Bot commands sozlash
bot.setMyCommands([
    { command: 'start', description: 'Botni boshlash' },
    { command: 'connect', description: 'Kanal ulash' },
    { command: 'setyoutube', description: 'YouTube kanal sozlash' },
    { command: 'preview', description: 'Postni ko\'rish' },
    { command: 'help', description: 'Yordam' },
    { command: 'mystatus', description: 'Mening holatim' },
    { command: 'admin', description: 'Admin panel (adminlar uchun)' }
]);

// Start komandasi
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    
    // User ma'lumotlarini saqlash
    await storage.saveUser({
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name
    });
    
    const welcomeText = `🎉 *Assalomu alaykum, ${user.first_name || 'Do\'st'}!*\n\n` +
        `*Humo TV Bot* ga xush kelibsiz! 🚀\n\n` +
        `📺 *Botning vazifasi:*\n` +
        `• YouTube kanalingizdagi yangi videolarni\n` +
        `• Jonli efirlarni\n` +
        `• Telegram kanalingizga AVTOMATIK e'lon qilish\n\n` +
        `⚡️ *Qonuniylik:*\n` +
        `✅ Faqat matn va havolalar\n` +
        `✅ Videolarni YUKLAMAYDI\n` +
        `✅ Muallif huquqiga HURMAT\n\n` +
        `📋 *Boshlash uchun:*\n` +
        `1. /connect - Telegram kanalingizni ulang\n` +
        `2. /setyoutube - YouTube kanalingiz manzilini yozing\n` +
        `3. Bot har 5 daqiqada tekshirib turadi\n\n` +
        `💡 /help - Batafsil yordam`;
    
    bot.sendMessage(chatId, welcomeText, { parse_mode: 'Markdown' });
});

// Kanal ulash komandasi
bot.onText(/\/connect/, async (msg) => {
    const chatId = msg.chat.id;
    
    const instructions = `📌 *Kanal ulash bo\'yicha ko\'rsatma:*\n\n` +
        `1. Botni kanalingizga ADMIN qilib qo'shing\n` +
        `2. Kanalga xabar yuborish ruxsatini bering\n` +
        `3. Kanal USERNAME ni yuboring (@siz)\n\n` +
        `📝 *Misol:*\n` +
        `• @ForHumoTV yoki\n` +
        `• ForHumoTV\n\n` +
        `Yoki kanal ID raqamini yuboring (manfiy son)\n\n` +
        `🔹 *Muhim:* Kanal ochiq (public) bo'lishi kerak`;
    
    bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });
    
    // Kanal username kutilmoqda
    bot.once('message', async (response) => {
        if (response.chat.id === chatId) {
            const channelUsername = response.text.replace('@', '');
            
            try {
                // Kanal ma'lumotlarini olish
                const chat = await bot.getChat(`@${channelUsername}`);
                
                await storage.connectChannel({
                    user_id: msg.from.id,
                    channel_id: chat.id,
                    channel_title: chat.title
                });
                
                bot.sendMessage(chatId, 
                    `✅ *${chat.title}* kanali muvaffaqiyatli ulandi!\n\n` +
                    `Endi YouTube kanalingizni sozlash uchun:\n` +
                    `/setyoutube - buyrug'idan foydalaning`, 
                    { parse_mode: 'Markdown' }
                );
                
            } catch (error) {
                bot.sendMessage(chatId, 
                    `❌ Xatolik: ${error.message}\n` +
                    `Kanalni tekshiring yoki botni kanalga admin qilib qo'shing.`
                );
            }
        }
    });
});

// YouTube kanal sozlash
bot.onText(/\/setyoutube/, async (msg) => {
    const chatId = msg.chat.id;
    
    const instructions = `📺 *YouTube Kanal Sozlash*\n\n` +
        `YouTube kanalingizning TO'LIQ manzilini yuboring:\n\n` +
        `📝 *Misol manzillar:*\n` +
        `• https://www.youtube.com/@ForHumo\n` +
        `• https://www.youtube.com/channel/UC1234567890\n` +
        `• https://www.youtube.com/c/ForHumoTV\n\n` +
        `🔍 Bot manzildan faqat kanal ID sini oladi`;
    
    bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });
    
    bot.once('message', async (response) => {
        if (response.chat.id === chatId) {
            const youtubeUrl = response.text;
            
            try {
                // YouTube kanal ID ni olish
                const youtube = require('./youtube');
                const channelId = await youtube.extractChannelId(youtubeUrl);
                const channelInfo = await youtube.getChannelInfo(channelId);
                
                // Database ga saqlash
                await storage.setYouTubeChannel({
                    user_id: msg.from.id,
                    youtube_url: youtubeUrl,
                    youtube_channel_id: channelId,
                    channel_title: channelInfo.title
                });
                
                bot.sendMessage(chatId,
                    `✅ *${channelInfo.title}* YouTube kanali sozlandi! 🎉\n\n` +
                    `📊 *Statistika:*\n` +
                    `• Obunachilar: ${parseInt(channelInfo.subscriberCount).toLocaleString()}\n` +
                    `• Videolar: ${parseInt(channelInfo.videoCount).toLocaleString()}\n\n` +
                    `📢 Bot har 5 daqiqada yangi videolarni tekshiradi\n` +
                    `🎬 Yangi video chiqsa avtomatik e'lan joylanadi\n\n` +
                    `/preview - Post ko'rinishini ko'rish`,
                    { parse_mode: 'Markdown' }
                );
                
            } catch (error) {
                bot.sendMessage(chatId,
                    `❌ Xatolik: ${error.message}\n` +
                    `To'g'ri YouTube kanal manzilini yuboring.`
                );
            }
        }
    });
});

// Post preview
bot.onText(/\/preview/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
        const userChannel = await storage.getUserChannel(msg.from.id);
        
        if (!userChannel || !userChannel.youtube_channel_id) {
            throw new Error('Kanal ulanmagan yoki YouTube sozlanmagan');
        }
        
        const youtube = require('./youtube');
        const latestVideos = await youtube.getLatestVideos(userChannel.youtube_channel_id, 1);
        
        if (latestVideos.length === 0) {
            throw new Error('Kanalda video topilmadi');
        }
        
        const video = latestVideos[0];
        const postText = formatPost(video, userChannel.plan || 'free');
        
        bot.sendMessage(chatId,
            `📋 *Post Ko'rinishi:*\n\n${postText}`,
            { parse_mode: 'Markdown', disable_web_page_preview: false }
        );
        
    } catch (error) {
        bot.sendMessage(chatId, `❌ ${error.message}\n\nKanal ulash uchun /connect va /setyoutube`);
    }
});

// Help komandasi
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpText = `🆘 *Humo TV Bot - Yordam*\n\n` +
        `*Asosiy buyruqlar:*\n` +
        `/start - Botni boshlash\n` +
        `/connect - Telegram kanal ulash\n` +
        `/setyoutube - YouTube kanal sozlash\n` +
        `/preview - Postni oldindan ko'rish\n` +
        `/mystatus - Mening holatim\n\n` +
        `*Tariflar:*\n` +
        `🎗️ *Bepul:* Har bir postda reklama qo'shimchasi\n` +
        `⭐️ *Plus (19,990 so'm/oy):* Toza post, reklamasiz\n\n` +
        `*Ish tartibi:*\n` +
        `1. Telegram kanal ulash\n` +
        `2. YouTube kanal sozlash\n` +
        `3. Bot har 5 daqiqada tekshiradi\n` +
        `4. Yangi video → Avtomatik post\n\n` +
        `*Qonuniylik:*\n` +
        `✅ Faqat matn e'lon qiladi\n` +
        `✅ Videolarni yuklamaydi\n` +
        `✅ YouTube API dan metadata oladi\n\n` +
        `*Aloqa:*\n` +
        `🌐 https://forhumo.uz\n` +
        `📢 @ForHumoTV\n` +
        `👥 @forhumo`;
    
    bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

// Admin komandasi
bot.onText(/\/admin/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Admin tekshirish
    if (!config.ADMINS.includes(userId)) {
        bot.sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun');
        return;
    }
    
    const stats = await storage.getStats();
    
    const adminText = `👑 *Admin Panel*\n\n` +
        `📊 *Statistika:*\n` +
        `• Foydalanuvchilar: ${stats.total_users}\n` +
        `• Kanallar: ${stats.total_channels}\n` +
        `• Plus tarif: ${stats.plus_users}\n\n` +
        `⚙️ *Sozlamalar:*\n` +
        `• Bot: @${config.BOT_USERNAME}\n` +
        `• Tekshirish: 5 daqiqa\n` +
        `• Database: humo.db\n\n` +
        `🛠️ *Admin buyruqlari:*\n` +
        `/admin_users - Barcha foydalanuvchilar\n` +
        `/admin_stats - Batafsil statistika\n` +
        `/admin_broadcast - Xabar yuborish`;
    
    bot.sendMessage(chatId, adminText, { parse_mode: 'Markdown' });
});

// Post formatlash funksiyasi
function formatPost(video, plan = 'free') {
    const youtubeLink = `https://youtu.be/${video.id}`;
    
    let post = '';
    
    // Video turiga qarab emoji
    if (video.type === 'live') {
        post = `🔴 *JONLI EFIR BOSHLANDI!*\n\n`;
    } else {
        post = `🎬 *YANGI VIDEO JOYLANDI!*\n\n`;
    }
    
    post += `📺 **Kanal:** ${video.channelTitle}\n`;
    post += `🎥 **Video:** ${video.title}\n`;
    post += `🔗 **Tomosha qilish:** ${youtubeLink}\n\n`;
    
    // Plan ga qarab footer qo'shish
    if (plan === 'free') {
        post += `⚡️ *Powered by "For Humo: Humo TV"*\n`;
        post += `🔹 For Humo TG kanal: https://t.me/forhumo\n`;
        post += `🔹 Humo TV TG kanal: https://t.me/ForHumoTV\n`;
        post += `🌐 Rasmiy sayt: https://forhumo.uz`;
    }
    
    return post;
}

// Xatolarni ushlash
bot.on('polling_error', (error) => {
    console.error('❌ Telegram polling error:', error.message);
});

// Bot tayyor ekanligini bildirish
console.log('✅ Bot ishga tushdi! @' + config.BOT_USERNAME);

// Scheduler ni ishga tushirish
scheduler.start(bot);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🛑 Bot to\'xtatilmoqda...');
    scheduler.stop();
    process.exit(0);
});
