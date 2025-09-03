const fs = require("fs");
const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const liveCacheFile = "./data/youtube/liveCache.json";

function loadLiveCache() {
  if (!fs.existsSync(liveCacheFile)) fs.writeFileSync(liveCacheFile, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(liveCacheFile));
}

function saveLiveCache(data) {
  fs.writeFileSync(liveCacheFile, JSON.stringify(data, null, 2));
}

async function getChannelAvatar(channelId) {
  try {
  const html = (await axios.get(`https://www.youtube.com/${channelId}`, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
    })).data;
  const match = html.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/);
  return match ? match[1] : null;
  } catch (e) {
    console.log("Error getChannelAvatar: ", e.message);
  }
}

function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchVideoData(videoId) {
  try {
  const res = await axios.post(
    "https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8",
    {
      videoId,
      context: { client: { clientName: "WEB", clientVersion: "2.20230101.00.00" } }
    },
    { headers: { "Content-Type": "application/json" } }
  );

  return res.data;
  } catch (e) {
    console.log("Error fetch streamHandler: ", e.message);
  }
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:` +
         `${minutes.toString().padStart(2, '0')}:` +
         `${seconds.toString().padStart(2, '0')}`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function monitorStreamEnd(client) {
  const liveCache = loadLiveCache();
  for (const [videoId, data] of Object.entries(liveCache)) {
    await pause(2000);
    const playerData = await fetchVideoData(videoId);
    const liveDetails = playerData ? playerData.microformat?.playerMicroformatRenderer?.liveBroadcastDetails : null;
    const details = playerData ? playerData.videoDetails : null;
    const playStatus = playerData ? playerData.playabilityStatus : null;
    
    // const avatarURL = await getChannelAvatar(`${playerData.microformat.playerMicroformatRenderer.ownerProfileUrl.split("www.youtube.com/")[1]}`)

    // Update peak & average if still live
    /* if (details && details.isLive) {
      const views = Number(details.viewCount || 0);
      data.peak = Math.max(data.peak, views);
      data.viewLog.push(views);
      liveCache[videoId] = data;
      saveLiveCache(liveCache);
      continue;
    } */

    // If not live anymore -> ended
    if (details && !details.isLive && liveDetails.isLiveNow === false && playStatus.status !== "UNPLAYABLE") {
      const endTime = new Date(liveDetails.endTimestamp).getTime();
      const durationMs = formatDuration(endTime - data.startTime);
      const avgViews = formatNumber(Math.round(data.viewLog.reduce((a, b) => a + b, 0) / data.viewLog.length));

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${data.author} was live.`, url: playerData.microformat.playerMicroformatRenderer.ownerProfileUrl, iconURL: data.avatar })
        .setTitle(details.title)
        .setURL(`https://youtu.be/${videoId}`)
        .setDescription(`Video available: [${durationMs}]`)
        .addFields(
        //  { name: "Viewers", value: `${avgViews} avg. / ${formatNumber(data.peak)} peak`, inline: true }
          // 
          { name: "Stream ended", value: `<t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)`, inline: true }
        )
        .setColor('#8a1616')
        .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
        .setFooter({ text: "Youtube Live", iconURL: `https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png` })
        .setTimestamp(new Date(data.startTime));

      // Edit all stored messages
      for (const msgData of data.discordMessageIds) {
        const ch = client.channels.cache.get(msgData.channelId);
        if (!ch) continue;
        try {
          const msg = await ch.messages.fetch(msgData.messageId);
          await msg.edit({ embeds: [embed] });
        } catch (err) {
          console.error(`❌ Failed to edit message ${msgData.messageId}:`, err.message);
        }
      }

      delete liveCache[videoId];
      saveLiveCache(liveCache);
    } else if (details && !details.isLive && playStatus.status === "UNPLAYABLE" && playStatus.reason.includes("members-only")) {
      const endTime = new Date(liveDetails.endTimestamp).getTime();
      const durationMs = formatDuration(endTime - data.startTime);
      const avgViews = formatNumber(Math.round(data.viewLog.reduce((a, b) => a + b, 0) / data.viewLog.length));

      const embed = new EmbedBuilder()
        .setAuthor({ name: `${data.author} was live.`, url: playerData.microformat.playerMicroformatRenderer.ownerProfileUrl, iconURL: data.avatar })
        .setTitle(details.title)
        .setURL(`https://youtu.be/${videoId}`)
        .setDescription(`This is a members-only content. \nVideo available: [${durationMs}]`)
        .addFields(
        //  { name: "Viewers", value: `${avgViews} avg. / ${formatNumber(data.peak)} peak`, inline: true }
          // 
          { name: "Stream ended", value: `<t:${Math.floor(endTime / 1000)}:R> (<t:${Math.floor(endTime / 1000)}:F>)`, inline: true }
        )
        .setColor('#8a1616')
        .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)
        .setFooter({ text: "Youtube Live", iconURL: `https://upload.wikimedia.org/wikipedia/commons/4/42/YouTube_icon_%282013-2017%29.png` })
        .setTimestamp(new Date(data.startTime));

      // Edit all stored messages
      for (const msgData of data.discordMessageIds) {
        const ch = client.channels.cache.get(msgData.channelId);
        if (!ch) continue;
        try {
          const msg = await ch.messages.fetch(msgData.messageId);
          await msg.edit({ embeds: [embed] });
        } catch (err) {
          console.error(`❌ Failed to edit message ${msgData.messageId}:`, err.message);
        }
      }

      delete liveCache[videoId];
      saveLiveCache(liveCache);
    }
  }
}

module.exports = async function streamMonitor(client) {
    await monitorStreamEnd(client)
};