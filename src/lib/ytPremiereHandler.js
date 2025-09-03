const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");
const youtubeConfig = require("../../data/youtube/config");

const YT_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const cacheFile = "./data/youtube/premiereCache.json";

function getCurrentFormattedTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

if (!fs.existsSync(cacheFile)) fs.writeFileSync(cacheFile, JSON.stringify({}));

function loadCache() {
  return JSON.parse(fs.readFileSync(cacheFile));
}

function saveCache(data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

function shouldSend(reason) {
  if (!reason) return true; // live tanpa reason → kirim
  
  const dayMatch = reason.match(/(\d+)\s+day/);
  if (dayMatch && parseInt(dayMatch[1]) > 0) return false; // skip kalau > stengah hari
  
  const hourMatch = reason.match(/(\d+)\s+hour/);
  if (hourMatch && parseInt(hourMatch[1]) > 12) return false; // skip kalau > 12 jam
  
  return true; // ≤ 12 jam → kirim
}

async function fetchVideoData(videoId) {
  const res = await axios.post(
    `https://www.youtube.com/youtubei/v1/player?key=${YT_API_KEY}`,
    {
      videoId,
      context: {
        client: { clientName: "WEB", clientVersion: "2.20230101.00.00" },
      },
    },
    { headers: { "Content-Type": "application/json" } }
  );
  return res.data;
}

async function sendOrUpdatePremiere(client, videoId, discordChannels) {
  const data = await fetchVideoData(videoId);
  const details = data.videoDetails;
  if (!details) return;

  const playStatus = data.playabilityStatus;
  if (!playStatus) return;

  const isPremiere = (details.isLive && details.isUpcoming) || details.isUpcoming;
  if (!isPremiere) return;

  const cache = loadCache();
  const status = details.isUpcoming
    ? "premiere-upcoming"
    : details.isLive
    ? "premiere-live"
    : "premiere-ended";

  // Embed builder
  let embed;
  if (status === "premiere-upcoming") {
    const micro = data.microformat.playerMicroformatRenderer;
    const startTime = new Date(micro.liveBroadcastDetails.startTimestamp);
    const unixTime = Math.floor(startTime.getTime() / 1000);
    embed = new EmbedBuilder()
      .setAuthor({ name: `${details.author} scheduled a Premiere 📅`, url: micro.ownerProfileUrl })
      .setTitle(details.title)
      .setURL(`https://youtu.be/${videoId}`)
      .addFields(
        // { name: "Description", value: `${details.shortDescription.trim().split("\n").slice(0, 2).join("\n")}` },
        { name: "Starts", value: `<t:${unixTime}:R> (<t:${unixTime}:F>)` }
      )
      .setColor("Orange")
      .setImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      .setFooter({ text: "Scheduled Premiere" })
      .setTimestamp(startTime);
  }

  if (status === "premiere-live") {
    const micro = data.microformat.playerMicroformatRenderer;
    embed = new EmbedBuilder()
      .setAuthor({ name: `${details.author} Premiere is LIVE! 🔴`, url: micro.ownerProfileUrl })
      .setTitle(details.title)
      .setURL(`https://youtu.be/${videoId}`)
      .addFields({
        name: "Description",
        value: `${details.shortDescription.trim().split("\n").slice(0, 4).join("\n")}`,
      })
      .setColor("#f21818")
      .setImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      .setFooter({ text: "Premiere started" })
      .setTimestamp(new Date(micro.liveBroadcastDetails.startTimestamp));
  }

  // Loop Discord channels
  for (const channelId of discordChannels) {
    const ch = client.channels.cache.get(channelId);
    if (!ch) continue;

    if (cache[videoId]?.[channelId]) {
      // already sent, try edit
      try {
        const msg = await ch.messages.fetch(cache[videoId][channelId]);
        await msg.edit({ embeds: [embed] });
        console.log(`✏️ Edited ${status} embed for ${videoId} in ${channelId}`);
      } catch (err) {
        console.error("❌ Failed to edit message:", err.message);
      }
    } else {
      // send new message
      const msg = await ch.send({
        content:
          status === "premiere-live"
            ? `**${details.author}** is now release a live Premiere! https://youtu.be/${videoId}`
            : `**${details.author}** scheduled a Premiere! https://youtu.be/${videoId}`,
        embeds: [embed],
      });
      if (!cache[videoId]) cache[videoId] = {};
      cache[videoId][channelId] = msg.id;
      saveCache(cache);
      console.log(`✅ Sent ${status} embed for ${videoId} in ${channelId}`);
    }
  }
}

async function checkChannel(client, { channelHandle, discordChannels, mentionRoleId }) {
  const cache = loadCache();
  try {
    const html = (await axios.get(`https://www.youtube.com/${channelHandle}/videos`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    })).data;
    const matches = [...new Set(
      [...html.matchAll(/"videoId":"(.*?)"/g)].map(m => m[1])
    )].slice(0, 5);

    if (matches.length === 0) {
      // console.log({ channel: channelHandle, status: "offline", reason: "No live or upcoming streams" });

      // Bersihkan cache video dari channel ini yang tidak ada di list
      cache
        .filter(entry => entry.channel === channelHandle)
        .forEach(entry => removeFromCache(cache, entry.videoId));

      return;
    }

    for (const videoId of matches) {
      /* const playerData = await fetchVideoData(videoId);
      const details = playerData.videoDetails;
      // console.log(details)
      const playStatus = playerData.playabilityStatus;
      const reason = playStatus.reason || null;

      let currentStatus = null;
      let currentReason = "";

      if (details.isLive) {
        currentStatus = playStatus.status === "UNPLAYABLE" ? "premiere-members" : "premiere-live";
        if (playStatus.status === "UNPLAYABLE") currentReason = reason.split(".")[0];
      } else if (details.isUpcoming) {
        currentStatus = playStatus.status === "UNPLAYABLE" ? "premiere-members" : "premiere-upcoming";
      } else {
        continue;
      } */

     // if (!shouldSend(reason)) continue;
      
      await sendOrUpdatePremiere(client, videoId, discordChannels);
    }
  } catch (err) {
    console.error(`[${getCurrentFormattedTime()}] ❌ Error checking Premiere ${channelHandle}:`, err.message);
  }
}

module.exports = async function ytPremiereHandler(client) {
  for (const config of youtubeConfig) {
    await checkChannel(client, config);
  }
};