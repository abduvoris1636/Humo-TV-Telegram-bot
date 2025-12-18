// scheduler.js
const cron = require('node-cron');
const youtube = require('./youtube');
const storage = require('./storage');

class Scheduler {
    constructor() {
        this.isRunning = false;
        this.bot = null;
    }

    start(bot) {
        this.bot = bot;
        this.isRunning = true;
        
        console.log('⏰ Scheduler ishga tushdi (har 5 daqiqada tekshiradi)');
        
        // Har 5 daqiqada barcha kanallarni tekshirish
        cron.schedule('*/5 * * * *', async () => {
            if (!this.isRunning) return;
            
            try {
                await this.checkAllChannels();
            } catch (error) {
                console.error('❌ Scheduler xatosi:', error);
            }
        });
        
        // Boshlang'ich tekshiruv
        setTimeout(() => {
            this.checkAllChannels();
        }, 5000);
    }

    stop() {
        this.isRunning = false;
        console.log('⏰ Scheduler to\'xtatildi');
    }

    async checkAllChannels() {
        if (!this.bot) {
            console.error('❌ Bot not initialized in scheduler');
            return;
        }
        
        console.log(`🔍 Kanallar tekshirilmoqda... ${new Date().toLocaleTimeString()}`);
        
        try {
            const channels = await storage.getAllActiveChannels();
            
            if (channels.length === 0) {
                console.log('ℹ️ Hech qanday faol kanal topilmadi');
                return;
            }
            
            console.log(`📊 ${channels.length} ta kanal tekshirilmoqda`);
            
            for (const channel of channels) {
                try {
                    await this.checkChannel(channel);
                    // Kichik kechikish (rate limit uchun)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error(`❌ Kanal ${channel.channel_title} tekshirishda xatolik:`, error.message);
                }
            }
            
            console.log(`✅ Barcha kanallar tekshirildi`);
            
        } catch (error) {
            console.error('❌ Kanallarni olishda xatolik:', error);
        }
    }

    async checkChannel(channel) {
        if (!channel.youtube_channel_id) {
            return;
        }
        
        try {
            // Yangi videolarni tekshirish
            const newVideos = await youtube.checkForNewVideos(
                channel.youtube_channel_id,
                channel.last_video_id
            );
            
            if (newVideos.length === 0) {
                return;
            }
            
            console.log(`🎬 Kanal "${channel.channel_title}" da ${newVideos.length} ta yangi video topildi`);
            
            // Yangi videolarni teskari tartibda (eng yangisidan boshlab) qayta ishlash
            for (const video of newVideos.reverse()) {
                try {
                    // Video avval post qilinganmi?
                    const alreadyPosted = await storage.isVideoPosted(channel.id, video.id);
                    
                    if (!alreadyPosted) {
                        // Post yuborish
                        await this.sendAnnouncement(channel, video);
                        
                        // Database ni yangilash
                        await storage.updateLastVideo(channel.id, video.id);
                        await storage.savePostedVideo(channel.id, video);
                        
                        console.log(`✅ Video "${video.title}" kanalga joylandi`);
                        
                        // Kichik kechikish
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                } catch (error) {
                    console.error(`❌ Video ${video.id} ni qayta ishlashda xatolik:`, error.message);
                }
            }
            
        } catch (error) {
            console.error(`❌ Kanal ${channel.channel_title} tekshirishda xatolik:`, error.message);
        }
    }

    async sendAnnouncement(channel, video) {
        if (!this.bot) return;
        
        const youtubeLink = `https://youtu.be/${video.id}`;
        
        let message = '';
        
        if (video.type === 'live') {
            message = `🔴 *JONLI EFIR BOSHLANDI!*\n\n`;
        } else {
            message = `🎬 *YANGI VIDEO JOYLANDI!*\n\n`;
        }
        
        message += `📺 **Kanal:** ${video.channelTitle || channel.channel_title}\n`;
        message += `🎥 **Video:** ${video.title}\n`;
        message += `🔗 **Tomosha qilish:** ${youtubeLink}\n\n`;
        
        // Plan ga qarab footer qo'shish
        if (channel.plan === 'free') {
            message += `⚡️ *Powered by "For Humo: Humo TV"*\n`;
            message += `🔹 For Humo TG kanal: https://t.me/forhumo\n`;
            message += `🔹 Humo TV TG kanal: https://t.me/ForHumoTV\n`;
            message += `🌐 Rasmiy sayt: https://forhumo.uz`;
        }
        
        try {
            // Telegram kanaliga post yuborish
            await this.bot.sendMessage(channel.channel_id, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: false
            });
            
            // Foydalanuvchiga notification yuborish
            if (channel.user_telegram_id) {
                const userMessage = `✅ Yangi video "${video.title}" kanalingizga joylandi!`;
                await this.bot.sendMessage(channel.user_telegram_id, userMessage);
            }
            
        } catch (error) {
            console.error(`❌ Kanalga xabar yuborishda xatolik:`, error.message);
            
            // Agar bot kanaldan chiqarilgan bo'lsa
            if (error.message.includes('chat not found') || error.message.includes('bot was kicked')) {
                console.log(`⚠️ Bot ${channel.channel_title} kanalidan chiqarilgan, kanalni deaktiv qilish`);
                // Bu yerda kanalni deaktiv qilish kodi bo'lishi kerak
            }
        }
    }
}

module.exports = new Scheduler();
