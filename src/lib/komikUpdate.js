const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");

const followedComics = JSON.parse(fs.readFileSync('./src/database/komik/followed.json', 'utf8'));
const lastPostedPath = './src/database/komik/lastPosted.json';
const lastPosted = fs.existsSync(lastPostedPath)
  ? JSON.parse(fs.readFileSync(lastPostedPath, 'utf8'))
  : {};

async function fetchLatestKomik() {
    try {
  const res = await axios.get(`https://komikindo.ch/komik-terbaru/`);
  const $ = cheerio.load(res.data);

  const latestUpdates = [];

  $('.animepost').each((i, el) => {
    const title = $(el).find('.tt').text().trim();

    if (!followedComics[title]) return;

    const url = $(el).find('a').attr('href');
      
    const chapterLink = $(el).find('.adds .lsch a').attr('href');
    const chapterText = $(el).find('.adds .lsch a').text().trim();
    const chapterMatch = chapterText.match(/Ch.\s*(\d+)/i);
    const chapterValue = chapterMatch ? chapterMatch[1] : chapterText;
      
    const timestamp = $(el).find('.adds .lsch .datech').text().trim();
    const image = $(el).find('.limit img').attr('src');

    const discordChannelId = followedComics[title].channelId;

    // Cek apakah ini update terbaru
    if (!lastPosted[title] || !lastPosted[title].includes(chapterValue)) {
      latestUpdates.push({
        title,
        url,
        image,
        chapterValue,
        timestamp,
        discordChannelId
      });
    }
  });
    
  return latestUpdates;
  } catch (err) {
      console.error(`Failed to fetch komik updates: ${err}`);
      return [];
  }
}

async function checkAndSendUpdates(client) {
    // const interval = 1200000;
    
    // while (true) {
  const updates = await fetchLatestKomik();
  console.log('📚 > Checking komik updates...');
    
  if (!updates.length) {
      return console.log('📚 > No updates...');
  } else {
      try {
      for (const update of updates) {
        let channel = await client.channels.cache.get(update.discordChannelId);
        if (!channel) {
          try {
            channel = await client.channels.fetch(update.discordChannelId);
          } catch (err) {
            console.error(`❄1�7 Channel ${update.discordChannelId} gak bisa diakses:`, err.message);
            continue;
          }
        }

        const link = update.url
            .replace(/https:\/\/komikindo\.rip\/komik\/\d+-/, 'https://komikindo.rip/') // Hapus /komik/ dan angka
            .replace(/\/$/, '') // Hapus slash di akhir kalau ada
            + `-chapter-${update.chapterValue}/`;
            //.replace(/(\/komik\/[\w-]+)/, `$1-chapter-${update.chapterValue}`)

        const rawTime = update.timestamp;
        console.log("RawTime: ", rawTime);
        let time;
        const waktu = parseInt(rawTime.match(/\d+/)[0]);
        if (rawTime.includes("menit")) {
          time = Math.floor(waktu * 60);
        } else if (rawTime.includes("jam")) {
          time = Math.floor(waktu * 60 * 60);
        } else if (rawTime.includes("detik")) {
          time = waktu
        }
        const now = Math.floor(Date.now() / 1000);
        const uploadAt = now - time;

        if (channel) {
          const embed = new EmbedBuilder()
            .setAuthor({ name: update.title })
            .setTitle(`Baca Chapter Baru ${update.title}`)
            .setURL(link)
            .addFields(
                { name: `New Chapter`, value: `${update.chapterValue}` },
                { name: `Last Update`, value: `<t:${uploadAt}:R>` }
            )
            .setImage(update.image.replace(/-\d+x\d+/, ''))
            .setColor("#06B5A4")
            .setFooter({ text: 'Source: Komikindo' })
            .setTimestamp(new Date(uploadAt * 1000));

          const baen = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Baca Disini").setURL(link)
          );
           
          if (!lastPosted[update.title]) {
    lastPosted[update.title] = [];
}

if (!lastPosted[update.title].includes(update.chapterValue)) {
    lastPosted[update.title].push(update.chapterValue);
    fs.writeFileSync(lastPostedPath, JSON.stringify(lastPosted, null, 4));
}

          const sent = await channel.send({
            content: `<@&1361545270940139623> 📢 New Update!`,
            embeds: [embed],
            components: [baen]
          });
          console.log(`📚 > ${update.title} sent to ${sent.channel.name}`);
        }
      }
    } catch (err) {
        console.error(`Error terdeteksi dalam lib/komikUpdate: ${err}`);
    }
  }
  // }
  //await new Promise(resolve => setTimeout(resolve, interval));
}

module.exports = { checkAndSendUpdates };
