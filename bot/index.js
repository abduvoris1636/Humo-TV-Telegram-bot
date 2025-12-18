// bot/index.js
/**
 * Main entry point for Humo TV Bot
 */

const config = require('./config');
const storage = require('./storage');
const telegram = require('./telegram');
const scheduler = require('./scheduler');

class HumoTVBot {
  constructor() {
    this.isShuttingDown = false;
  }

  /**
   * Initialize the bot
   */
  async initialize() {
    console.log('🚀 Initializing Humo TV Bot...');
    
    try {
      // Validate configuration
      config.validateConfig();
      console.log('✅ Configuration validated');
      
      // Initialize database
      await storage.initDatabase();
      console.log('✅ Database initialized');
      
      // Telegram bot is already initialized in telegram.js
      console.log('✅ Telegram bot initialized');
      
      // Start scheduler
      scheduler.start();
      console.log('✅ Scheduler started');
      
      console.log('🎉 Humo TV Bot is ready and running!');
      console.log(`🤖 Bot username: ${config.BOT_USERNAME}`);
      console.log(`⏰ Check interval: ${config.CHECK_INTERVAL / 1000} seconds`);
      console.log('📢 Monitoring for YouTube updates...');
      
      // Set up graceful shutdown
      this.setupGracefulShutdown();
      
    } catch (error) {
      console.error('❌ Failed to initialize bot:', error);
      process.exit(1);
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        if (this.isShuttingDown) return;
        
        this.isShuttingDown = true;
        console.log(`\n${signal} received, shutting down gracefully...`);
        
        try {
          // Stop scheduler
          scheduler.stop();
          console.log('✅ Scheduler stopped');
          
          // Close database connection
          storage.close();
          console.log('✅ Database connection closed');
          
          console.log('👋 Humo TV Bot shutdown complete');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      });
    });
  }

  /**
   * Get bot status
   */
  getStatus() {
    return {
      name: 'Humo TV Bot',
      version: '1.0.0',
      status: 'running',
      uptime: process.uptime(),
      scheduler: scheduler.getStatus(),
      timestamp: new Date().toISOString()
    };
  }
}

// Start the bot if this file is run directly
if (require.main === module) {
  const bot = new HumoTVBot();
  bot.initialize().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = HumoTVBot;
