const axios = require('axios');
const fs = require('fs');
const { EmbedBuilder } = require('discord.js');
const users = './src/lib/instagram/config.js';
const mentions = require('./config.js');
const cacheFile = './src/lib/instagram/cache.json';

function loadCache() {
  if (!fs.existsSync(cacheFile)) fs.writeFileSync(cacheFile, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(cacheFile));
}

function saveCache(data) {
  fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
}

async function fetchLatestInstagramPost(client, username, channelId) {
  const cache = loadCache();
  try {
    const res = await axios.get(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        'x-ig-app-id': '936619743392459'
      }
    });

    const user = res.data.data.user;
    const latestPosts = user.edge_owner_to_timeline_media.edges.slice(0, 3);

    for (const post of latestPosts.reverse()) {
      const shortcode = post.node.shortcode;
      if (cache[username]?.includes(shortcode)) continue;

      await sendToDiscord(client, user, post.node, channelId);

      // Save to cache
      if (!cache[username]) cache[username] = [];
      cache[username].push(shortcode);
      if (cache[username].length > 10) cache[username].shift(); // Keep cache short
      
      saveCache(cache);
    }
  } catch (err) {
    console.error(`❌ Gagal ambil data @${username}:`, err.response?.status || err.message);
  }
}

async function sendToDiscord(client, user, post, channelId) {
  const channel = await client.channels.fetch(channelId).catch(() => null);
  if (!channel) return console.error(`❌ Channel tidak ditemukan: ${channelId}`);

  const caption = post.edge_media_to_caption.edges[0]?.node.text || '(No caption)';
  const postLink = `https://www.instagram.com/p/${post.shortcode}/`;

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${user.full_name} (@${user.username})`, url: `https://instagram.com/${user.username}`, iconURL: user.profile_pic_url_hd })
    .setDescription(caption.length > 2048 ? caption.slice(0, 2045) + '...' : caption)
    .setURL(postLink)
    .setImage(post.display_url)
    .setColor('#E1306C')
    .setFooter({ text: 'Instagram by Sistine', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Instagram_icon.png' })
    .setTimestamp(new Date(post.taken_at_timestamp * 1000));

  await channel.send({ content: `📸 Post baru dari **@${user.username}**: ${postLink}`, embeds: [embed] });
  // console.log(`✅ Dikirim @${user.username}: ${postLink}`);
}

async function checkInstagram(client) {
        for (const user of mentions) {
            await fetchLatestInstagramPost(client, user.username, user.channelId);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
};

async function checkAndSendInstagram(client) {
    await checkInstagram(client);
    setInterval(checkInstagram, 30 * 60 * 1000);
}

module.exports = { checkAndSendInstagram }