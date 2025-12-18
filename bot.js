import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import { BOT_TOKEN, ADMIN_ID } from "./config.js";

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const channelsFile = "./channels.json";
if (!fs.existsSync(channelsFile)) {
  fs.writeFileSync(channelsFile, JSON.stringify([]));
}

function getChannels() {
  return JSON.parse(fs.readFileSync(channelsFile));
}

// /start
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "👋 Humo TV botga xush kelibsiz!\n\n📌 Kanal ulash uchun:\n/addchannel"
  );
});

// Kanal qo‘shish
bot.onText(/\/addchannel/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "📣 Kanalingiz username'ini yuboring:\nMasalan: @mychannel"
  );

  bot.once("message", (m) => {
    if (!m.text.startsWith("@")) return;

    const channels = getChannels();
    channels.push({
      owner: m.chat.id,
      channel: m.text,
      premium: false
    });

    fs.writeFileSync(channelsFile, JSON.stringify(channels, null, 2));
    bot.sendMessage(m.chat.id, "✅ Kanal muvaffaqiyatli ulandi!");
  });
});

// Admin video post
bot.onText(/\/newvideo (.+)/, (msg, match) => {
  if (msg.chat.id !== ADMIN_ID) return;

  const link = match[1];
  const channels = getChannels();

  const text = `🎬 YANGI VIDEO JOYLANDI!

👉 ${link}

⚡️ Powered by "For Humo: Humo TV"

🔗 For Humo TG kanal:
https://t.me/forhumo

🔗 Humo TV TG kanal:
https://t.me/ForHumoTV

🌐 https://forhumo.uz`;

  channels.forEach(c => {
    bot.sendMessage(c.channel, text);
  });
});

