// bot/scheduler.js
/**
 * Background scheduler for checking YouTube updates
 */

const cron = require('node-cron');
const storage = require('./storage');
const youtube = require('./youtube');
const telegram = require('./telegram');

class Scheduler {
  constructor() {
    this.isRunning = false;
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Start the scheduler
   */
  start() {
    console.log('🔄 Starting scheduler...');
    
    // Run immediately on start
    this.checkAllChannels();
    
    // Schedule regular checks (every 5 minutes)
    cron.schedule('*/5 * * * *', () => {
      this.checkAllChannels();
    });
    
    console.log('✅ Scheduler started (runs every 5 minutes)');
    this.isRunning = true;
  }

  /**
   * Check all active channels for new content
   */
  async checkAllChannels() {
    console.log(`⏰ Checking for new content at ${new Date().toLocaleString()}`);
    
    try {
      const channels = await storage.getActiveChannels();
      
      if (channels.length === 0) {
        console.log('ℹ️ No active channels to check');
        return;
      }
      
      console.log(`🔍 Checking ${channels.length} channel(s)...`);
      
      for (const channel of channels) {
        try {
          await this.checkChannel(channel);
        } catch (error) {
          console.error(`❌ Error checking channel ${channel.channel_id}:`, error.message);
        }
      }
      
      console.log('✅ All channels checked successfully');
    } catch (error) {
      console.error('❌ Error in checkAllChannels:', error);
    }
  }

  /**
   * Check a single channel for new content
   */
  async checkChannel(channel) {
    // Skip if no YouTube channel ID
    if (!channel.youtube_channel_id) {
      return;
    }
    
    try {
      // Get new content from YouTube
      const newContent = await youtube.checkForNewContent(
        channel.youtube_channel_id,
        channel.last_video_id
      );
      
      if (newContent.length === 0) {
        return; // No new content
      }
      
      console.log(`📢 Found ${newContent.length} new item(s) for ${channel.channel_id}`);
      
      // Process new content (from newest to oldest)
      for (const content of newContent.reverse()) {
        try {
          // Check if already posted
          const alreadyPosted = await storage.isVideoPosted(channel.channel_id, content.id);
          
          if (!alreadyPosted) {
            // Send announcement
            const success = await telegram.sendAnnouncement(channel.channel_id, content, channel);
            
            if (success) {
              // Update last video ID
              await storage.updateLastVideo(channel.channel_id, content.id, content.type);
              
              // Record in database
              await storage.recordPostedVideo(channel.channel_id, content.id, content.title, content.type);
              
              console.log(`✅ Posted ${content.type}: ${content.title}`);
              
              // Small delay between posts to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        } catch (error) {
          console.error(`❌ Error processing content ${content.id}:`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error checking channel ${channel.channel_id}:`, error.message);
      
      // Log the error but don't crash
      if (error.response) {
        console.error('YouTube API Error:', error.response.status, error.response.statusText);
      }
    }
  }

  /**
   * Manually trigger a check
   */
  async manualCheck() {
    console.log('🔄 Manual check triggered');
    await this.checkAllChannels();
  }

  /**
   * Stop the scheduler
   */
  stop() {
    this.isRunning = false;
    console.log('🛑 Scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      checkInterval: this.checkInterval,
      lastCheck: new Date().toISOString()
    };
  }
}

module.exports = new Scheduler();
