import fs from "fs";
import fetch from "node-fetch";
import { BOT_TOKEN, CHANNEL_USERNAME, YT_CHANNEL_ID } from "../config.js";

const LAST_VIDEO_FILE = "./data/lastVideo.json";

export default async function handler(req, res) {
  const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YT_CHANNEL_ID}`;
  const rss = await fetch(rssUrl).then(r => r.text());

  const videoId = rss.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
  const title = rss.match(/<title>(.*?)<\/title>/)?.[1];
  const link = `https://youtu.be/${videoId}`;

  const last = fs.existsSync(LAST_VIDEO_FILE)
    ? JSON.parse(fs.readFileSync(LAST_VIDEO_FILE))
    : {};

  if (last.videoId === videoId) {
    return res.json({ status: "no new video" });
  }

  fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ videoId }));

  const text = `🎬 *Yangi video joylandi!*\n\n📌 ${title}\n🔗 ${link}`;

  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CHANNEL_USERNAME,
      text,
      parse_mode: "Markdown"
    })
  });

  res.json({ status: "posted" });
}

