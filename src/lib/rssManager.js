const { EmbedBuilder } = require('discord.js');
const Parser = require('rss-parser'); 
const fs = require('fs');
const axios = require('axios');

const parser = new Parser(); 
const RSS_URL = 'https://rss.app/feeds/be56yZBAvoK0AAGe.xml'; 
const TWEETS_FILE = './tweets.json';

const rssUsers = {
    "https://rss.app/feeds/O1866fvpBbkpkNiF.xml": ["1346175755318722641"], // Hali
    "https://rss.app/feeds/be56yZBAvoK0AAGe.xml": ["1357360035772240023"], // Pingu
    "https://rss.app/feeds/4ETUal5wu4sCM1ND.xml": ["1392129596777955328"], // Dontol
    "https://rss.app/feeds/kkzbsmipOW546AbK.xml": ["1358785368647929873"]
};

function loadSavedTweets() { 
    if (!fs.existsSync(TWEETS_FILE)) fs.writeFileSync(TWEETS_FILE, JSON.stringify([])); 
    return JSON.parse(fs.readFileSync(TWEETS_FILE)); 
}

function saveTweets(data) { 
    fs.writeFileSync(TWEETS_FILE, JSON.stringify(data, null, 2)); 
}

function cleanText(str) { 
    return str 
        ?.replace(/(<([^>]+)>)/gi, '') 
        .replace(/&/g, '&') 
        .replace(/</g, '<') 
        .replace(/>/g, '>') 
        .replace(/— .+?@.+?\) \(.+?\) @.+? \(.+?\)/g, '')
        .trim(); 
}

async function resolveTcoLinks(text) {
  const tcoRegex = /https:\/\/t\.co\/\w+/g;
  const links = text.match(tcoRegex);

  if (!links) return text;

  const resolvedLinks = await Promise.all(
    links.map(async (shortUrl) => {
      try {
        const response = await axios.get(shortUrl, {
          maxRedirects: 0,
          validateStatus: (status) => status >= 300 && status < 400,
        });
        const resolvedUrl = response.headers.location || shortUrl;
        return { shortUrl, resolvedUrl };
      } catch (err) {
        return { shortUrl, resolvedUrl: shortUrl };
      }
    })
  );

  let replaced = text;
  for (const { shortUrl, resolvedUrl } of resolvedLinks) {
    replaced = replaced.replace(shortUrl, resolvedUrl);
  }

  return replaced;
}

async function getAvatarURL(username) {
  const url = `https://unavatar.io/twitter/${username}?fallback=https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No avatar found');
    return url;
  } catch (e) {
    return 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + username;
  }
}

async function fetchAndSendRSSFeed(client) {
    const savedLinks = loadSavedTweets();
    
    for (const [rssUrl, channelIds] of Object.entries(rssUsers)) {
        try {
            const feed = await parser.parseURL(rssUrl);
    
            const sortedItems = feed.items
              .slice(0, 3)
              .sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
            
            for (const item of sortedItems) {
                const retSaved = item.title.startsWith('RT by @');
                const usern = item.creator.replace('@', '').trim();
                const retUser = retSaved ? item.title.split('RT by @')[1].split(':')[0] : "unknown";
                const linkSaved = retSaved ? item.link.replace(usern, retUser) : item.link;
                const isAlreadySaved = savedLinks.includes(linkSaved);
                if (isAlreadySaved) continue;
            
                const title = cleanText(item.title);
                const rawContent = cleanText(item.contentSnippet);
                let content = rawContent;
                
                const tcoMatch = content.match(/https:\/\/t\.co\/\w+/);
                let tweetId = null;
                let quotedUser = null;
                let expanded = "";
        
                if (tcoMatch) {
                    expanded = await resolveTcoLinks(content);
                    if (expanded && expanded.includes('/status/')) {
                        quotedUser = expanded.split('twitter.com/')[1].split('/status/')[0];
                        tweetId = expanded.split('/status/')[1].split('— ')[0];
                        content = title;
                    }
                }
                
                const date = item.isoDate;
                const tweetUrl = item.link;
                
                const unixTime = Math.floor(new Date(date).getTime() / 1000);
            
                const isRetweet = title.startsWith('RT by @');
                const isReply = title.startsWith('R to @');
                // const isQuote = content.includes('status/');
            
                const username = item.creator.replace('@', '').trim();
                const retweetUser = isRetweet ? title.split('RT by @')[1].split(':')[0] : "unknown";
                const retweetLink = isRetweet ? tweetUrl.replace(username, retweetUser) : tweetUrl;
                const repliedUser = isReply ? title.split('R to @')[1].split(':')[0] : "unknown";
                
                const avatarURL = await getAvatarURL(username);
            
                const embed = new EmbedBuilder()
                    .setColor('#1DA1F2')
                    // .setTimestamp(new Date(date))
                    // .setFooter({ text: 'via RSS.app' });
            
                if (isRetweet) {
                    
                    embed
                        .setAuthor({ name: `@${username}`, url: tweetUrl, iconURL: avatarURL })
                        .setDescription(`${title.split(':').slice(1).join(':')}`);
                } else if (isReply) {
                    embed
                        .setAuthor({ name: `@${username}`, url: tweetUrl, iconURL: avatarURL })
                        .setDescription(`@${repliedUser} ${title.split(':').slice(1).join(':')}`);
                } else {
                    if (expanded.includes('/status/')) {
                        const fullLink = `https://twitter.com/${quotedUser}/status/${tweetId}`;
                        embed
                            .setAuthor({ name: `@${username}`, url: tweetUrl, iconURL: avatarURL })
                            .setDescription(`@${quotedUser} ${content}`)
                            .addFields({ name: 'Quoted Tweet', value: fullLink });
                    } else {
                    embed
                        .setAuthor({ name: `@${username}`, url: tweetUrl, iconURL: avatarURL })
                        .setDescription(title);
                    }
                }
            
                /* const isQuote = expanded.includes('/status/');
                
                if (isQuote) {
                    const fullLink = `https://twitter.com/${quotedUser}/status/${tweetId}`;
                    embed.addFields({ name: 'Quoted Tweet', value: fullLink });
                } */
            
                // embed.addFields({ name: 'Link', value: 
                const twitUrl = isRetweet ? retweetLink : tweetUrl;
                
                if (item.enclosure && item.enclosure.type.startsWith('image')) embed.setImage(item.enclosure.url);
                
                // Message Content
                let messageContent = "";
                if (isRetweet) {
                    messageContent = `**@${retweetUser}** reposted **@${username}** 🔁 : ${twitUrl}`
                } else if (isReply) {
                    messageContent = `**@${username}** replied to **@${repliedUser}** 💬 <t:${unixTime}:R>: ${twitUrl}`
                } else {
                    if (expanded.includes('/status/')) {
                        messageContent = `**@${username}** quoted a post from **@${quotedUser}** 🗨 <t:${unixTime}:R>: ${twitUrl}`
                    } else {
                        messageContent = `**@${username}** made a new post <t:${unixTime}:R>: ${twitUrl}`
                    }
                }
                // Message Content
                for (const channelId of channelIds) {
                    const channel = client.channels.cache.get(channelId);
                    if (channel) channel.send({ content: messageContent, embeds: [embed] });
                }
            
                savedLinks.push(twitUrl);
                saveTweets(savedLinks);
            }
            
        } catch (err) { 
            console.error('❌ Error fetching RSS feed:', err); 
        } 
    }
}
        
module.exports = { fetchAndSendRSSFeed };

