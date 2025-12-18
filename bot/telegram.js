// bot/telegram.js
/**
 * Telegram Bot functionality
 * Handles commands, messages, and post formatting
 */

const TelegramBot = require('node-telegram-bot-api');
const config = require('./config');
const storage = require('./storage');
const youtube = require('./youtube');

class TelegramService {
  constructor() {
    this.bot = new TelegramBot(config.TELEGRAM_BOT_TOKEN, { polling: true });
    this.setupCommands();
    this.setupHandlers();
  }

  /**
   * Setup bot commands
   */
  setupCommands() {
    this.bot.setMyCommands([
      { command: 'start', description: 'Botni ishga tushirish' },
      { command: 'connect_channel', description: 'Kanal ulash' },
      { command: 'set_youtube', description: 'YouTube kanalini sozlash' },
      { command: 'preview_post', description: 'Postni oldindan ko\'rish' },
      { command: 'help', description: 'Yordam' },
      { command: 'status', description: 'Bot holati (admin)' },
      { command: 'users_count', description: 'Foydalanuvchilar soni (admin)' }
    ]);
  }

  /**
   * Setup message handlers
   */
  setupHandlers() {
    // Start command
    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    // Connect channel command
    this.bot.onText(/\/connect_channel/, async (msg) => {
      await this.handleConnectChannel(msg);
    });

    // Set YouTube channel command
    this.bot.onText(/\/set_youtube/, async (msg) => {
      await this.handleSetYouTube(msg);
    });

    // Preview post command
    this.bot.onText(/\/preview_post/, async (msg) => {
      await this.handlePreviewPost(msg);
    });

    // Help command
    this.bot.onText(/\/help/, async (msg) => {
      await this.handleHelp(msg);
    });

    // Admin commands
    this.bot.onText(/\/status/, async (msg) => {
      await this.handleStatus(msg);
    });

    this.bot.onText(/\/users_count/, async (msg) => {
      await this.handleUsersCount(msg);
    });

    // Handle callback queries (for buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Handle channel posts (when bot is added to channel)
    this.bot.on('channel_post', async (post) => {
      await this.handleChannelPost(post);
    });
  }

  /**
   * Handle /start command
   */
  async handleStart(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const username = msg.from.username;
    const firstName = msg.from.first_name;
    const lastName = msg.from.last_name;

    // Save user to database
    await storage.addUser(userId, username, firstName, lastName);

    const welcomeMessage = `🎉 *Humo TV Bot'ga xush kelibsiz!*\n\n` +
      `Bu bot YouTube kanalingizdagi yangi videolar va jonli efirlar haqida ` +
      `Telegram kanalingizga avtomatik ravishda e'lon joylaydi.\n\n` +
      `📋 *Asosiy buyruqlar:*\n` +
      `/connect_channel - Telegram kanalingizni ulash\n` +
      `/set_youtube - YouTube kanal manzilini sozlash\n` +
      `/preview_post - Postni oldindan ko'rish\n` +
      `/help - Yordam olish\n\n` +
      `⚠️ *Muhim eslatma:* Bot faqat matn va havolalarni joylaydi, ` +
      `videolarni yuklamaydi va qayta joylamaydi.`;

    await this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
  }

  /**
   * Handle /connect_channel command
   */
  async handleConnectChannel(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const instructions = `📌 *Kanal ulash bo'yicha ko'rsatmalar:*\n\n` +
      `1. Botni kanalingizga *admin* qilib qo'shing\n` +
      `2. Botga kanalda xabar yuborish ruxsatini bering\n` +
      `3. Kanal ID raqamini yuboring (@ belgisiz)\n\n` +
      `*Misol:* @ForHumoTV yozish o'rniga shunchaki *ForHumoTV* yozing\n\n` +
      `Yoki, agar kanalingiz shaxsiy bo'lsa, uning ID raqamini yuboring.`;

    await this.bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });

    // Wait for channel ID
    this.bot.once('message', async (responseMsg) => {
      if (responseMsg.from.id === userId) {
        const channelId = responseMsg.text;
        const channelTitle = channelId; // Default title

        try {
          // Save channel connection
          const user = await storage.getUserByTelegramId(userId);
          await storage.connectChannel(user.id, `@${channelId}`, channelTitle, '');

          const successMessage = `✅ Kanal muvaffaqiyatli ulandi!\n\n` +
            `Endi YouTube kanal manzilini sozlash uchun /set_youtube buyrug'idan foydalaning.`;

          await this.bot.sendMessage(chatId, successMessage);
        } catch (error) {
          await this.bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
        }
      }
    });
  }

  /**
   * Handle /set_youtube command
   */
  async handleSetYouTube(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const instructions = `📺 *YouTube kanalini sozlash*\n\n` +
      `YouTube kanalingizning to'liq manzilini yuboring:\n\n` +
      `*Misol manzillar:*\n` +
      `• https://www.youtube.com/@ForHumo\n` +
      `• https://www.youtube.com/channel/UC1234567890\n` +
      `• https://www.youtube.com/c/ForHumoTV\n\n` +
      `Bot faqat YouTube kanalingiz haqida ma'lumot olish uchun manzildan foydalanadi.`;

    await this.bot.sendMessage(chatId, instructions, { parse_mode: 'Markdown' });

    // Wait for YouTube URL
    this.bot.once('message', async (responseMsg) => {
      if (responseMsg.from.id === userId) {
        const youtubeUrl = responseMsg.text;

        try {
          // Extract channel ID from URL
          const channelId = await youtube.extractChannelId(youtubeUrl);
          
          // Get channel info
          const channelInfo = await youtube.getChannelInfo(channelId);
          
          // Update database
          const user = await storage.getUserByTelegramId(userId);
          await storage.connectChannel(user.id, user.connected_channel_id, '', youtubeUrl);

          const successMessage = `✅ YouTube kanali muvaffaqiyatli sozlandi!\n\n` +
            `📛 *Kanal nomi:* ${channelInfo.title}\n` +
            `👥 *Obunachilar:* ${channelInfo.subscriberCount}\n` +
            `🎬 *Videolar:* ${channelInfo.videoCount}\n\n` +
            `Bot har 5 daqiqada yangi kontentni tekshiradi va Telegram kanalingizga avtomatik e'lon joylaydi.`;

          await this.bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
        } catch (error) {
          await this.bot.sendMessage(chatId, `❌ Xatolik: ${error.message}\n\n` +
            `Iltimos, to'g'ri YouTube kanal manzilini yuboring.`);
        }
      }
    });
  }

  /**
   * Handle /preview_post command
   */
  async handlePreviewPost(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    try {
      const user = await storage.getUserByTelegramId(userId);
      const channel = await storage.getChannelById(user.connected_channel_id);

      if (!channel || !channel.youtube_channel_id) {
        throw new Error('Kanal ulanmagan yoki YouTube manzili sozlanmagan');
      }

      // Get latest video for preview
      const videos = await youtube.getLatestVideos(channel.youtube_channel_id, 1);
      
      if (videos.length === 0) {
        throw new Error('Kanalda videolar topilmadi');
      }

      const video = videos[0];
      const postText = this.formatPost(video, channel);

      // Send preview
      await this.bot.sendMessage(chatId, `📋 *Post ko'rinishi:*\n\n${postText}`, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });

    } catch (error) {
      await this.bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
    }
  }

  /**
   * Handle /help command
   */
  async handleHelp(msg) {
    const chatId = msg.chat.id;

    const helpMessage = `🆘 *Humo TV Bot Yordam*\n\n` +
      `*Botning maqsadi:*\n` +
      `YouTube kanalingizdagi yangi videolar va jonli efirlar haqida ` +
      `Telegram kanalingizga avtomatik ravishda e'lon joylash.\n\n` +
      `*Qonuniylik:*\n` +
      `• Bot faqat matn va havolalarni joylaydi\n` +
      `• Videolarni yuklamaydi va qayta joylamaydi\n` +
      `• Mualliflik huquqiga hurmat qiladi\n\n` +
      `*Tariflar:*\n` +
      `• *Bepul:* Har bir postda reklama qo'shimchasi\n` +
      `• *Plus (19,990 so'm/oy):* Reklamasiz, toza postlar\n\n` +
      `*Ish tartibi:*\n` +
      `1. /connect_channel - Telegram kanalingizni ulang\n` +
      `2. /set_youtube - YouTube kanal manzilini sozlang\n` +
      `3. Bot avtomatik yangiliklarni kuzatib boradi\n\n` +
      `*Qo'shimcha ma'lumot:*\n` +
      `🌐 Rasmiy sayt: https://forhumo.uz\n` +
      `📢 Kanal: @ForHumoTV\n` +
      `👥 Hamjamiyat: @forhumo`;

    await this.bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  }

  /**
   * Handle /status command (admin only)
   */
  async handleStatus(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check admin rights
    if (!config.ADMIN_IDS.includes(userId)) {
      await this.bot.sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun');
      return;
    }

    try {
      const stats = await storage.getStats();
      const statusMessage = `📊 *Bot Holati*\n\n` +
        `👥 *Foydalanuvchilar:* ${stats.total_users}\n` +
        `📢 *Kanallar:* ${stats.total_channels}\n` +
        `⭐️ *Plus tarif:* ${stats.plus_users}\n` +
        `🔄 *Tekshirish oraligi:* ${config.CHECK_INTERVAL / 1000} soniya\n` +
        `✅ *Bot faol*\n\n` +
        `*Konfiguratsiya:*\n` +
        `• YouTube API: ${config.YOUTUBE_API_KEY ? '✅' : '❌'}\n` +
        `• Telegram Bot: ${config.TELEGRAM_BOT_TOKEN ? '✅' : '❌'}\n` +
        `• Ma'lumotlar bazasi: ${config.DATABASE_PATH}`;

      await this.bot.sendMessage(chatId, statusMessage, { parse_mode: 'Markdown' });
    } catch (error) {
      await this.bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
    }
  }

  /**
   * Handle /users_count command (admin only)
   */
  async handleUsersCount(msg) {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    // Check admin rights
    if (!config.ADMIN_IDS.includes(userId)) {
      await this.bot.sendMessage(chatId, '❌ Bu buyruq faqat adminlar uchun');
      return;
    }

    try {
      const stats = await storage.getStats();
      await this.bot.sendMessage(chatId, `📊 Jami foydalanuvchilar: ${stats.total_users}`);
    } catch (error) {
      await this.bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
    }
  }

  /**
   * Handle callback queries (for future features like subscription buttons)
   */
  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // Handle different callback data
    switch (data) {
      case 'subscribe_plus':
        // Handle Plus subscription
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Plus tarif sozlamalari tez orada qo\'shiladi'
        });
        break;
      default:
        await this.bot.answerCallbackQuery(callbackQuery.id, {
          text: 'Noma\'lum buyruq'
        });
    }
  }

  /**
   * Handle channel posts (when bot is added to channel)
   */
  async handleChannelPost(post) {
    // This can be used to detect when bot is added to a channel
    console.log('Bot added to channel:', post.chat.title);
  }

  /**
   * Format post text according to requirements
   */
  formatPost(video, channel) {
    const { title, type, id } = video;
    const youtubeLink = `https://youtu.be/${id}`;
    
    let post = '';
    
    // Different emoji based on content type
    if (type === 'live') {
      post = `🔴 Jonli efir boshlanmoqda!\n`;
    } else if (type === 'premiere') {
      post = `🎥 Yangi premyera!\n`;
    } else {
      post = `🎬 Yangi video joylandi!\n`;
    }
    
    post += `📺 Kanal: ${video.channelTitle || channel.channel_title}\n`;
    post += `🔗 Tomosha qilish: ${youtubeLink}\n\n`;
    
    // Add footer based on plan
    if (channel.plan === 'free') {
      post += config.DEFAULT_FOOTER;
    }
    
    return post;
  }

  /**
   * Send announcement to Telegram channel
   */
  async sendAnnouncement(channelId, video, channelData) {
    try {
      const postText = this.formatPost(video, channelData);
      
      // Send message to channel
      await this.bot.sendMessage(channelId, postText, {
        parse_mode: 'Markdown',
        disable_web_page_preview: false
      });
      
      console.log(`✅ Announcement sent to ${channelId} for video ${video.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send announcement to ${channelId}:`, error.message);
      
      // Check if bot was removed from channel
      if (error.response && error.response.statusCode === 403) {
        console.log(`Bot removed from channel ${channelId}, marking as inactive`);
        // Here you would update channel status to inactive in database
      }
      
      return false;
    }
  }

  /**
   * Get bot instance
   */
  getBot() {
    return this.bot;
  }
}

module.exports = new TelegramService();
