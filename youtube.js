// youtube.js
const axios = require('axios');
const config = require('./config');

class YouTubeService {
    constructor() {
        this.apiKey = config.YOUTUBE_API_KEY;
        this.baseUrl = 'https://www.googleapis.com/youtube/v3';
    }

    // Extract channel ID from URL
    async extractChannelId(url) {
        try {
            // Remove any query parameters
            const cleanUrl = url.split('?')[0];
            
            // Handle different URL formats
            if (cleanUrl.includes('@')) {
                // Handle @username format
                const handle = cleanUrl.split('@')[1].split('/')[0];
                return await this.getChannelIdByHandle(handle);
            } else if (cleanUrl.includes('/channel/')) {
                // Direct channel ID
                return cleanUrl.split('/channel/')[1].split('/')[0];
            } else if (cleanUrl.includes('/c/')) {
                // Custom URL
                const customUrl = cleanUrl.split('/c/')[1].split('/')[0];
                return await this.getChannelIdByCustomUrl(customUrl);
            } else if (cleanUrl.includes('/user/')) {
                // User URL
                const username = cleanUrl.split('/user/')[1].split('/')[0];
                return await this.getChannelIdByUsername(username);
            } else {
                throw new Error('Invalid YouTube URL format');
            }
        } catch (error) {
            throw new Error(`Failed to extract channel ID: ${error.message}`);
        }
    }

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

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('Channel not found');
            }

            return response.data.items[0].snippet.channelId;
        } catch (error) {
            throw new Error(`Channel not found for handle @${handle}`);
        }
    }

    async getChannelInfo(channelId) {
        try {
            const response = await axios.get(`${this.baseUrl}/channels`, {
                params: {
                    part: 'snippet,statistics',
                    id: channelId,
                    key: this.apiKey
                }
            });

            if (!response.data.items || response.data.items.length === 0) {
                throw new Error('Channel not found');
            }

            const channel = response.data.items[0];
            return {
                id: channel.id,
                title: channel.snippet.title,
                description: channel.snippet.description,
                subscriberCount: channel.statistics.subscriberCount || '0',
                videoCount: channel.statistics.videoCount || '0',
                thumbnails: channel.snippet.thumbnails
            };
        } catch (error) {
            throw new Error(`Failed to get channel info: ${error.message}`);
        }
    }

    async getLatestVideos(channelId, maxResults = 5) {
        try {
            // First get the uploads playlist ID
            const channelResponse = await axios.get(`${this.baseUrl}/channels`, {
                params: {
                    part: 'contentDetails',
                    id: channelId,
                    key: this.apiKey
                }
            });

            if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
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

            if (!videosResponse.data.items || videosResponse.data.items.length === 0) {
                return [];
            }

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
            console.error('YouTube API Error:', error.response?.data || error.message);
            return [];
        }
    }

    async checkForNewVideos(channelId, lastVideoId = null) {
        try {
            const videos = await this.getLatestVideos(channelId, 10);
            
            if (!lastVideoId) {
                return videos.slice(0, 1); // Return only latest if no last video
            }

            // Find new videos since lastVideoId
            const lastVideoIndex = videos.findIndex(video => video.id === lastVideoId);
            
            if (lastVideoIndex === -1) {
                // Last video not found in recent videos, return all
                return videos;
            }

            // Return videos before the last video
            return videos.slice(0, lastVideoIndex);
        } catch (error) {
            console.error('Error checking for new videos:', error.message);
            return [];
        }
    }
}

module.exports = new YouTubeService();
