const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const followedAnime = JSON.parse(fs.readFileSync('./src/database/anime/followed.json', 'utf8'));
const lastPostedPath = './src/database/anime/lastPosted.json';
const lastPosted = fs.existsSync(lastPostedPath)
	? JSON.parse(fs.readFileSync(lastPostedPath, 'utf8'))
	: {};

async function fetchLatestAnime() {
  const res = await axios.get('https://samehadaku.now/anime-terbaru/');
  const $ = cheerio.load(res.data);

  const updates = [];

  $('.post-show li').each((i, el) => {
    const title = $(el).find('.entry-title').text().trim();
      
    // if (!followedAnime[title]) return;
    
    const url = $(el).find('.entry-title a').attr('href');
    const episode = $(el).find('author[itemprop="name"]').first().text().trim();
    const releases = $(el).find('.dashicons-calendar').parent().text().replace('Released on', '').trim();
    const release = releases.replace(': ', '');
    const thumbnail = $(el).find('.thumb img').attr('src');
      
    const discordChannelId = "1361280542636773477"; // followedAnime[title].channelId;
      
    if (!lastPosted[title] || !lastPosted[title].includes(episode)) {
      updates.push({
        title,
        url,
        episode,
        release,
        thumbnail,
        discordChannelId
      });
    }
  });

  return updates;
}

async function checkLatestAnime(client) {
    //const interval = 1200000;
    
    // while (true) {
    const updates = await fetchLatestAnime();
    console.log('📺 > Checking anime updates...')
    if (!updates && !updates.length) {
        return console.log('📺 > No updates...');
    } else {
        try {
        for (const update of updates) {
            if (!update) continue;
            let channel = client.channels.cache.get(update.discordChannelId);
            if (!channel) {
              try {
                channel = await client.channels.fetch(update.discordChannelId);
              } catch (err) {
                console.error(`❄1�7 Channel ${update.discordChannelId} gak bisa diakses:`, err.message);
                continue;
              }
            }

            if (!channel) {
                console.log(`❄1�7 Channel not found: ${update.discordChannelId}`);
                continue;
            }
            const rawTime = update.release;
            let time;
            const waktu = parseInt(rawTime.match(/\d+/)[0]);
            if (rawTime.includes('days')) {
                time = Math.floor(waktu * 60 * 60 * 24);
            } else if (rawTime.includes('hours')) {
                time = Math.floor(waktu * 60 * 60);
            } else if (rawTime.includes('minutes')) {
                time = Math.floor(waktu * 60);
            } else {
                time = waktu;
            }
            const now = Math.floor(Date.now() / 1000)
            const uploadAt = now - time;

            if (channel) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: update.title })
                    .setTitle(`Nonton Anime ${update.title}`)
                    .setURL(update.url)
                    .addFields(
                        { name: 'New Episode', value: update.episode },
                        { name: 'Last Update', value: `<t:${uploadAt}:R>` }
                    )
                    .setImage(update.thumbnail)
                    .setColor('#06B5A4')
                    .setFooter({ text: 'Source: Samehadaku'})
                    .setTimestamp(new Date(uploadAt * 1000));

                const baen = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Nonton Disini").setURL(update.url)
                );

                if (!lastPosted[update.title]) {
    lastPosted[update.title] = [];
}

if (!lastPosted[update.title].includes(update.episode)) {
    lastPosted[update.title].push(update.episode);
    fs.writeFileSync(lastPostedPath, JSON.stringify(lastPosted, null, 4));
}
                
                const sent = await channel.send({
                    content: `<@&1361545310832300062> 📢 New Update!`,
                    embeds: [embed],
                    components: [baen]
                })
                console.log(`📺 > ${update.title} sent to ${sent.channel.name}`)
            }
        }
      } catch (err) {
          console.error(`Error terdeteksi dalam lib/animeUpdate: ${err}`);
      }
    }
        //await new Promise(resolve => setTimeout(resolve, interval));
      // }
}

module.exports = { checkLatestAnime };
