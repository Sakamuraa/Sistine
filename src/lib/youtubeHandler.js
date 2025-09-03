const youtubeConfig = require("../../data/youtube/config");
const fs = require("fs");
const axios = require("axios");
const { EmbedBuilder } = require("discord.js");

// const { sendOrUpdatePremiere } = require("./ytPremiereHandler.js");

const cacheFile = "./data/youtube/cache.json";

function getCurrentFormattedTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

async function getChannelAvatar(channelId) {
  try {
  const html = (await axios.get(`https://www.youtube.com/${channelId}`, { headers })).data;
  const match = html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
  return match ? match[1] : null;
  } catch (e) {
    console.log("Error getChannelAvatar: ", e.message);
  }
}

function shouldSend(reason) {
  if (!reason) return true; // live tanpa reason → kirim
  
  const dayMatch = reason.match(/(\d+)\s+day/);
  if (dayMatch && parseInt(dayMatch[1]) > 1) return false; // skip kalau > stengah hari
  
  const hourMatch = reason.match(/(\d+)\s+hour/);
  if (hourMatch && parseInt(hourMatch[1]) > 12) return false; // skip kalau > 12 jam
  
  return true; // ≤ 12 jam → kirim
}

async function fetchVideoData(videoId) {
  try {
  const res = await axios.post(
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    {
      videoId,
      context: { client: { clientName: "WEB", clientVersion: "2.20230101.00.00" } } // "2.20250115.01.00" } } New ver
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return res.data;
  } catch (e) {
    console.log(`[${getCurrentFormattedTime()}] Error fetchVideoData for ${videoId}: ${e.message}`);
  }
}

const liveCacheFile = "./data/youtube/liveCache.json";

function loadLiveCache() {
  if (!fs.existsSync(liveCacheFile)) fs.writeFileSync(liveCacheFile, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(liveCacheFile));
}

function saveLiveCache(data) {
  fs.writeFileSync(liveCacheFile, JSON.stringify(data, null, 2));
}

async function sendToDiscord(client, details, playerData, videoId, discordChannels, status, reason, mentionRoleId) {
  let embed;
  let avatarURL = "none";

  if (status === "live") {
    avatarURL = await getChannelAvatar(`@${playerData.microformat.playerMicroformatRenderer.ownerProfileUrl.split("@")[1]}`);
    const description = details.shortDescription ? details.shortDescription.trim().split("\n").slice(0, 4).join("\n") : "(No Description)";
    
    embed = new EmbedBuilder()
      .setAuthor({ name: `${details.author} is went live! 🔴`, url: playerData.microformat.playerMicroformatRenderer?.ownerProfileUrl, iconURL: avatarURL})
      .setTitle(details.title)
      .setURL(`https://youtu.be/${videoId}`)
      .addFields({ name: "Description", value: description })
      .setImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      .setColor('#f21818')
      .setFooter({ text: "Youtube Live", iconURL: `https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png` })
      .setTimestamp(new Date(playerData.microformat.playerMicroformatRenderer.liveBroadcastDetails.startTimestamp));
  } else if (status === "live-members") {
    avatarURL = await getChannelAvatar(`@${playerData.microformat.playerMicroformatRenderer.ownerProfileUrl.split("@")[1]}`);
    const description = details.shortDescription ? details.shortDescription.trim().split("\n").slice(0, 4).join("\n") : "(No Description)";
    const reas = reason ? reason : "This is a members-only content.";
    
    embed = new EmbedBuilder()
      .setAuthor({ name: `${details.author} is went members-only live! 🔴`, url: playerData.microformat.playerMicroformatRenderer?.ownerProfileUrl, iconURL: avatarURL})
      .setTitle(details.title)
      .setURL(`https://youtu.be/${videoId}`)
      .setDescription(reas)
      .addFields({ name: "Description", value: description })
      .setImage(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      .setColor('#f21818')
      .setFooter({ text: "Youtube Live", iconURL: `https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png` })
      .setTimestamp(new Date(playerData.microformat.playerMicroformatRenderer.liveBroadcastDetails.startTimestamp));
  } /* else if (status === "upcoming" || status === "upcoming-members") {
    const startTime = new Date(playerData.microformat.playerMicroformatRenderer.liveBroadcastDetails.startTimestamp);
    const unixTime = Math.floor(startTime.getTime() / 1000);

    embed = new EmbedBuilder()
      .setAuthor({ name: `${details.author} scheduled a stream 📅`, url: playerData.microformat.playerMicroformatRenderer.ownerProfileUrl, iconURL: avatarURL })
      .setTitle(details.title)
      .setURL(`https://youtu.be/${videoId}`)
      .addFields(
        //{ name: "Description", value: `${details.shortDescription.trim().split("\n").slice(0, 4).join("\n")}` },
        { name: "Starts", value: `<t:${unixTime}:R> (<t:${unixTime}:F>)` }
      )
      .setColor('Orange')
      .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
      .setFooter({ text: "Scheduled stream", iconURL: `https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png` })
      .setTimestamp(startTime);
  } */ // UPCOMING - disabled for now
  
  const liveCache = loadLiveCache();

  for (const channelId of discordChannels) {
    const discordChannel = client.channels.cache.get(channelId);
    const mention = mentionRoleId ? `<@&${mentionRoleId}> ` : '';
    if (!discordChannel) continue;

    const sentMessage = await discordChannel.send({
      content: status.includes("live")
        ? `${mention}${details.author} is now live! Watch it here! \nhttps://youtu.be/${videoId}`
        : ``,
      embeds: [embed]
    });

    if (status.includes("live")) {
      const ytStartTime = new Date(playerData.microformat.playerMicroformatRenderer.liveBroadcastDetails.startTimestamp).getTime();
      liveCache[videoId] = {
        startTime: ytStartTime,
        peak: Number(details.viewCount || 0),
        viewLog: [Number(details.viewCount || 0)],
        discordMessageIds: [...(liveCache[videoId]?.discordMessageIds || []), { channelId, messageId: sentMessage.id }],
        author: details.author,
        avatar: avatarURL
      };
    }
  }
  saveLiveCache(liveCache);
}

function loadCache() {
  if (!fs.existsSync(cacheFile)) fs.writeFileSync(cacheFile, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(cacheFile));
}

function saveCache(data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

function updateCache(cache, videoId, status) {
  const index = cache.findIndex(entry => entry.videoId === videoId);
  if (index === -1) {
    cache.push({ videoId, status });
  } else {
    cache[index].status = status;
  }
  saveCache(cache);
}

function isCachedWithSameStatus(cache, videoId, status) {
  const entry = cache.find(e => e.videoId === videoId);
  return entry && entry.status === status;
}

function removeFromCache(cache, videoId) {
  const index = cache.findIndex(e => e.videoId === videoId);
  if (index !== -1) {
    cache.splice(index, 1);
    saveCache(cache);
    console.log(`[${getCurrentFormattedTime()}] 🗑️ Removed ${videoId} from cache (offline)`);
  }
}

async function checkChannel(client, { channelHandle, discordChannels, mentionRoleId }) {
  const cache = loadCache();
  try {
    await pause(5000);
    const html = (await axios.get(`https://www.youtube.com/${channelHandle}/streams`, { headers })).data;
    const matches = [...new Set(
      [...html.matchAll(/"videoId":"(.*?)"/g)].map(m => m[1])
    )].slice(0, 5);

    if (matches.length === 0) {
      // console.log({ channel: channelHandle, status: "offline", reason: "No live or upcoming streams" });

      // Bersihkan cache video dari channel ini yang tidak ada di list
      /* cache
        .filter(entry => entry.channel === channelHandle)
        .forEach(entry => removeFromCache(cache, entry.videoId)); */

      return;
    }

    for (const videoId of matches) {
      await pause(2000);
      const playerData = await fetchVideoData(videoId);
      const details = playerData?.videoDetails;
      
      if (!details) {
        /* console.warn(`⚠️ Skip ${videoId} (${channelHandle}) karena videoDetails kosong`);
        console.debug("PlayerData:", JSON.stringify(playerData.playabilityStatus, null, 2)); */
        continue;
      }
      const playStatus = playerData.playabilityStatus;
      const reason = playStatus.reason || null;

      let currentStatus = null;
      let currentReason = "";

      if (details.isLive) {
        currentStatus = playStatus.status === "UNPLAYABLE" ? "live-members" : "live";
        if (playStatus.status === "UNPLAYABLE") currentReason = reason.split(".")[0];
        
      } else if (details.isUpcoming) {
        currentStatus = playStatus.status === "UNPLAYABLE" ? "upcoming-members" : "upcoming";
        
      } else {
        // Kalau udah bukan live/upcoming → hapus dari cache
        // console.log(details)
        removeFromCache(cache, videoId);
        continue;
      }
      
      if (isCachedWithSameStatus(cache, videoId, currentStatus)) continue;
      if (!shouldSend(reason)) continue;

      await sendToDiscord(client, details, playerData, videoId, discordChannels, currentStatus, currentReason, mentionRoleId);

      updateCache(cache, videoId, currentStatus);
    }
  } catch (err) {
    console.error(`[${getCurrentFormattedTime()}] ❌ Error checking ${channelHandle}:`, err.message);
  }
}

module.exports = async function youtubeHandler(client) {
  for (const config of youtubeConfig) {
    await checkChannel(client, config);
  }
};