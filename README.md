# README.md

# Humo TV Bot 🤖

Professional, legal, and scalable Telegram bot for automatically posting YouTube video announcements to Telegram channels.

## 🎯 Features

- **Legal & Copyright Compliant**: Only posts text announcements with links, no video downloads
- **Multi-Channel Support**: Users can connect their own Telegram channels
- **Real-time Monitoring**: Checks for new videos and live streams every 5 minutes
- **Monetization Ready**: Free plan with branding, Plus plan without ads
- **Production Ready**: Error handling, logging, and graceful shutdown

## 🛠️ Tech Stack

- **Node.js** - Runtime environment
- **node-telegram-bot-api** - Telegram Bot API wrapper
- **SQLite** - Lightweight database
- **YouTube Data API v3** - For fetching video metadata only
- **Axios** - HTTP client for API requests
- **node-cron** - For scheduling background checks

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/humo-tv-bot.git
   cd humo-tv-bot
