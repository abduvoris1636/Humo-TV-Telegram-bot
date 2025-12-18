// bot/youtube.js
/**
 * YouTube Data API integration
 * ONLY fetches metadata - NO video downloads
 */

const axios = require('axios');
const config = require('./config');

class YouTubeService {
  constructor() {
    this.apiKey = config.YOUTUBE_API_KEY;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  /**
   * Extract YouTube Channel ID from URL
   */
  extractChannelId(url) {
    try {
      const urlObj = new URL(url);
      
      // Handle different YouTube URL formats
      if (urlObj.pathname.startsWith('/@')) {
        // Handle @username format - need to convert to channel ID
        return this.getChannelIdByHandle(urlObj.pathname.substring(2));
      } else if (urlObj.pathname.startsWith('/channel/')) {
        // Direct channel ID
        return urlObj.pathname.split('/')[2];
      } else if (urlObj.pathname.startsWith('/c/') || urlObj.pathname.startsWith('/user/')) {
        // Custom URL or username
        const identifier = urlObj.pathname.split('/')[2];
        return this.getChannelIdByCustomUrl(identifier);
      }
      
      throw new Error('Invalid YouTube channel URL format');
    } catch (error) {
      throw new Error(`Failed to extract channel ID: ${error.message}`);
    }
  }

  /**
   * Get channel ID by handle (@username)
   */
  async getChannelIdByHandle(handle) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: handle,
          type: 'channel',
          key: this.apiKey,
          maxResults: 1
        }
      });

      if (response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      return response.data.items[0].snippet.channelId;
    } catch (error) {
      throw new Error(`Failed to get channel ID for handle ${handle}: ${error.message}`);
    }
  }

  /**
   * Get channel ID by custom URL
   */
  async getChannelIdByCustomUrl(customUrl) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          q: customUrl,
          type: 'channel',
          key: this.apiKey,
          maxResults: 1
        }
      });

      if (response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      return response.data.items[0].snippet.channelId;
    } catch (error) {
      throw new Error(`Failed to get channel ID for custom URL ${customUrl}: ${error.message}`);
    }
  }

  /**
   * Get latest videos from a channel
   */
  async getLatestVideos(channelId, maxResults = 5) {
    try {
      // First, get the uploads playlist ID
      const channelResponse = await axios.get(`${this.baseUrl}/channels`, {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: this.apiKey
        }
      });

      if (channelResponse.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

      // Get videos from uploads playlist
      const videosResponse = await axios.get(`${this.baseUrl}/playlistItems`, {
        params: {
          part: 'snippet,contentDetails',
          playlistId: uploadsPlaylistId,
          key: this.apiKey,
          maxResults: maxResults
        }
      });

      return videosResponse.data.items.map(item => ({
        id: item.contentDetails.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        type: 'video'
      }));
    } catch (error) {
      throw new Error(`Failed to get latest videos: ${error.message}`);
    }
  }

  /**
   * Get live streams from a channel
   */
  async getLiveStreams(channelId) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          channelId: channelId,
          eventType: 'live',
          type: 'video',
          key: this.apiKey,
          maxResults: 5
        }
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        type: 'live'
      }));
    } catch (error) {
      // No live streams is not an error
      if (error.response && error.response.status === 404) {
        return [];
      }
      throw new Error(`Failed to get live streams: ${error.message}`);
    }
  }

  /**
   * Get upcoming premieres
   */
  async getUpcomingPremieres(channelId) {
    try {
      const response = await axios.get(`${this.baseUrl}/search`, {
        params: {
          part: 'snippet',
          channelId: channelId,
          eventType: 'upcoming',
          type: 'video',
          key: this.apiKey,
          maxResults: 5
        }
      });

      return response.data.items.map(item => ({
        id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        channelTitle: item.snippet.channelTitle,
        thumbnails: item.snippet.thumbnails,
        type: 'premiere'
      }));
    } catch (error) {
      // No premieres is not an error
      if (error.response && error.response.status === 404) {
        return [];
      }
      throw new Error(`Failed to get premieres: ${error.message}`);
    }
  }

  /**
   * Get channel information
   */
  async getChannelInfo(channelId) {
    try {
      const response = await axios.get(`${this.baseUrl}/channels`, {
        params: {
          part: 'snippet,statistics',
          id: channelId,
          key: this.apiKey
        }
      });

      if (response.data.items.length === 0) {
        throw new Error('Channel not found');
      }

      const channel = response.data.items[0];
      return {
        id: channel.id,
        title: channel.snippet.title,
        description: channel.snippet.description,
        thumbnails: channel.snippet.thumbnails,
        subscriberCount: channel.statistics.subscriberCount,
        videoCount: channel.statistics.videoCount
      };
    } catch (error) {
      throw new Error(`Failed to get channel info: ${error.message}`);
    }
  }

  /**
   * Check for new content (videos, live streams, premieres)
   */
  async checkForNewContent(channelId, lastKnownVideoId = null) {
    try {
      const [videos, liveStreams, premieres] = await Promise.all([
        this.getLatestVideos(channelId, 3),
        this.getLiveStreams(channelId),
        this.getUpcomingPremieres(channelId)
      ]);

      // Combine all content
      const allContent = [...videos, ...liveStreams, ...premieres];
      
      // Sort by publish date (newest first)
      allContent.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      // Filter for new content if lastKnownVideoId is provided
      if (lastKnownVideoId) {
        const lastKnownIndex = allContent.findIndex(item => item.id === lastKnownVideoId);
        return lastKnownIndex > 0 ? allContent.slice(0, lastKnownIndex) : allContent;
      }

      return allContent;
    } catch (error) {
      console.error(`Error checking for new content: ${error.message}`);
      return [];
    }
  }
}

module.exports = new YouTubeService();
