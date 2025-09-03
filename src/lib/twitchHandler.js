// twitchHandler.js
const axios = require("axios");
const { EmbedBuilder } = require("discord.js");
const fs = require("fs");

const cacheFile = "./data/twitch/twitchCache.json";
if (!fs.existsSync(cacheFile)) fs.writeFileSync(cacheFile, JSON.stringify({}));

const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const GQL_URL = "https://gql.twitch.tv/gql";

const CHANNEL_QUERY = `
  query ChannelShell($login: String!) {
    user(login: $login) {
      id
      login
      displayName
      profileImageURL(width: 300)
      stream {
        id
        type
        title
        viewersCount
        createdAt
        previewImageURL(width: 1920, height: 1080)
        game {
          id
          name
        }
      }
    }
  }
`;

function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Config Twitch -> Discord Channel IDs
const twitchConfig = [
  { 
    login: "pingumoroll", 
    discordChannels: ["1357360035772240023"], 
    mentionRoleId: "1357384389373333544"
  },
  {  
    login: "ditanyaan",
    discordChannels: ["1407188305535307929"],
    mentionRoleId: "1407187362689061026"
  }
  // { login: "michimochievee", discordChannels: ["1396795849375355040"] }
  // { login: "riotgames", discordChannels: ["345678901234567890"] }
];

function loadCache() {
  return JSON.parse(fs.readFileSync(cacheFile));
}

function saveCache(data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

async function fetchTwitchData(login) {
  try {
    const { data } = await axios.post(
      GQL_URL,
      {
        operationName: "ChannelShell",
        variables: { login },
        query: CHANNEL_QUERY,
      },
      {
        headers: {
          "Client-ID": CLIENT_ID,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const user = data?.data?.user;
    if (!user) return null;
    return {
      author: user.displayName,
      login: user.login,
      avatar: user.profileImageURL,
      url: `https://www.twitch.tv/${user.login}`,
      stream: user.stream
        ? {
            title: user.stream.title,
            game: user.stream.game?.name || null,
            viewers: user.stream.viewersCount,
            startedAt: user.stream.createdAt,
            thumbnail: user.stream.previewImageURL,
          }
        : null,
    };
  } catch (err) {
    console.error(`❌ Error fetching ${login}:`, err.message);
    return null;
  }
}

async function sendToDiscord(client, data, discordChannels, status, mentionRoleId) {
  let embed;
  if (status === "live") {
    embed = new EmbedBuilder()
      .setAuthor({ name: `${data.author}`, url: data.url, iconURL: data.avatar })
      .setTitle(data.stream.title)
      .setURL(data.url)
      .setDescription(`${data.author} is now live on Twitch!`)
      .addFields(
        { name: "Playing", value: data.stream.game || "Unknown", inline: true },
        // { name: "Viewers", value: data.stream.viewers.toLocaleString(), inline: true },
      )
      .setImage(data.stream.thumbnail)
      .setColor("#9146FF")
      .setFooter({ text: "Twitch", iconURL: "https://www.citypng.com/public/uploads/preview/hd-twitch-purple-square-app-icon-transparent-background-png-701751695117658kpcgpt8zng.png" })
      .setTimestamp(new Date(data.stream.startedAt));
    
    for (const channelId of discordChannels) {
      const ch = client.channels.cache.get(channelId);
      const mention = mentionRoleId ? `<@&${mentionRoleId}> ` : '';
      if (ch) await ch.send({ content: `${mention}${data.author} is now live over at ${data.url} !`, embeds: [embed] });
    }
  } /* else if (status === "offline") {
    embed = new EmbedBuilder()
      .setAuthor({ name: `${data.author} is now offline`, url: data.url, iconURL: data.avatar })
      .setColor("Grey")
      .setFooter({ text: "Twitch", iconURL: "https://upload.wikimedia.org/wikipedia/commons/2/26/Twitch_logo.svg" })
      .setTimestamp(new Date());
  } */
}

async function twitchHandler(client) {
  const cache = loadCache();

  for (const config of twitchConfig) {
    await pause(5000);
    const data = await fetchTwitchData(config.login);
    if (!data) continue;

    const currentStatus = data.stream ? "live" : "offline";
    const previousStatus = cache[config.login]?.status;

    // kalau status berubah, kirim notif
    if (currentStatus !== previousStatus) {
      await sendToDiscord(client, data, config.discordChannels, currentStatus, config.mentionRoleId);
      cache[config.login] = { status: currentStatus };
      saveCache(cache);
      // console.log(`✅ Sent ${currentStatus} notification for ${data.author}`);
    }

    await new Promise(r => setTimeout(r, 500)); // biar ga kebanyakan request
  }
}

module.exports = twitchHandler;