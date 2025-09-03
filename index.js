const {
    ActivityType,
    Client,
    Collection,
    ChannelType,
    GatewayIntentBits,
    Partials,
    WebhookClient,
    ApplicationCommandType,
    EmbedBuilder,
    channelLink,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    GuildOnboardingPromptOption,
    PermissionsBitField,
    PermissionFlagsBits,
    TextInputBuilder,
    TextInputStyle
} = require("discord.js");
// const { Player } = require('discord-player');
// const { extractors } = require('@discord-player/extractor');
const { DR, RR, AfkUser, GuildConfig, connectToDatabase } = require('./src/database/mongoose');
const fetch = require("node-fetch");
const { httpExpress } = require("./express.js");
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { startBot } = require('./src/handlers/startBot.js');
const { checkAndSendUpdates } = require('./src/lib/komikUpdate.js');
const { checkLatestAnime } = require('./src/lib/animeUpdate.js');
const { LavaShark } = require('lavashark');
require('dotenv').config();
//require('./server');

//EVENTHANDLER
const eventHandler = require('./src/handlers/eventHandler.js');
connectToDatabase();
//

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.User, Partials.Message, Partials.Reaction],
    allowedMentions: {
        parse: ['users', 'roles'],
    },
    restRequestTimeout: 10000,
});

startBot(client); // client.login(process.env.BOT_TOKEN);
client.commands = new Collection();


eventHandler(client);
httpExpress(client);


client.on('ready', async () => {
    checkTweets();
    checkYoutube();
    checkYtMonitor();
    checkYtPremiere();
    checkTwitch();
});


const he = require('he');

function decodeHtmlEntities(text) {
    return he.decode(text);
}

// Time logs start
function getCurrentFormattedTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
// Time logs end

// Global interaction listener for handling modal submission
const nhentai = require('./src/handlers/interactionCreate/nhentai');

client.on('interactionCreate', async interaction => {
    await nhentai(client, interaction);
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    
    // if (!interaction.isModalSubmit()) return;
    
    // if (interaction.isStringSelectMenu()) {
        if (interaction.customId === "select-role") {
            const member = await interaction.guild.members.fetch(interaction.user.id);
            const config = await DR.findOne({ guildId: interaction.guild.id, messageId: interaction.message.id });
            if (!config) {
                return interaction.reply({ content: "❌ Konfigurasi tidak ditemukan.", ephemeral: true });
            }

            const selectedIds = interaction.values; // Role yang dipilih user sekarang
            const allMenuRoleIds = config.reactions.map(r => r.roleId); // Semua role dari menu

            // Hanya tambahkan role yang:
            // - Ada di menu
            // - Belum dimiliki user
            const rolesToAdd = selectedIds.filter(id =>
                allMenuRoleIds.includes(id) && !member.roles.cache.has(id)
            );

            // Hanya hapus role yang:
            // - Ada di menu
            // - Dimiliki user
            // - Tapi tidak dipilih sekarang
            const rolesToRemove = allMenuRoleIds.filter(id =>
                selectedIds.includes(id) && member.roles.cache.has(id)
            );

            try {
                await Promise.all([
                    ...rolesToAdd.map(async (id) => {
                        await member.roles.add(id);
                    }),
                    ...rolesToRemove.map(id => member.roles.remove(id))
                ]);

                let addedText = rolesToAdd.map(id => `<@&${id}>`).join(", ");
                let removedText = rolesToRemove.map(id => `<@&${id}>`).join(", ");

                let response = "";

                if (addedText) response += `**Added:** ${addedText}`;
                if (removedText) response += `${addedText ? "\n" : ""}**Removed:** ${removedText}`;

                await interaction.reply({
                    content: response || "⚠️ Tidak ada perubahan role.",
                    ephemeral: true
                 });
            } catch (err) {
                console.error(err);
                await interaction.reply({
                    content: "❌ Gagal mengatur role kamu.",
                    ephemeral: true
                });
            }
        }
        
     //   return;
    //} END OF STRING SELECT MENU
});

// const handleMusic = require('./handlers/musicHandler');
const handleAI = require('./src/handlers/messageCreate/aiHandler');
const handleOwOReminder = require('./src/handlers/messageCreate/owoRemindHandler');
const handleLeveling = require('./src/handlers/messageCreate/levelHandler');
const handleGamechat = require('./src/handlers/messageCreate/gamechatPing');
const handleMusic = require('./src/handlers/messageCreate/music.js');
const handleSpam = require('./src/handlers/messageCreate/spamHandler');

client.on('messageCreate', async message => {
    if (message.author.bot) return;
    
    const guildId = message.guild.id;
    const userId = message.author.id;
    
    await handleAI(message, client);
    await handleOwOReminder(message, client);
    await handleLeveling(message, client);
    await handleGamechat(message, client);
    await handleMusic(message, client);
    await handleSpam(message, client);
    
    // Remove AFK status if the user sends a message

    const afkUser = await AfkUser.findOneAndDelete({ userId, guildId });

    if (afkUser) {
        const member = message.guild.members.cache.get(userId);

        if (member) {
            const originalNickname = member.nickname?.replace(/^\[AFK\] /, "");

            try {
                await member.setNickname(originalNickname);
            } catch (error) {
                console.error(`Failed to restore nickname for ${member.user.tag}:`, error.message);
            }

            const userNick = member.displayName;
            const embed = new EmbedBuilder()
                .setDescription(`- **_${userNick}_** \n\`\`\`is no longer AFK.\`\`\``)
                .setColor('#06B5A4');

            await message.channel.send({ embeds: [embed] });
        }
    }

    // Check mentions
    if (message.mentions.members.size) {
        const mentionedUsers = message.mentions.members.map(member => member.id);

        for (const mentionedUserId of mentionedUsers) {
            const mentionedAfkUser = await AfkUser.findOne({ userId: mentionedUserId, guildId });
            const guildUser = message.guild.members.cache.get(mentionedUserId);

            if (mentionedAfkUser) {
                const embed = new EmbedBuilder()
                    .setDescription(`- **_${guildUser.nickname} is AFK_** \n\`\`\`Reason: ${mentionedAfkUser.reason}\`\`\``)
                    .setColor('#06B5A4');

                await message.channel.send({ embeds: [embed] });
            }
        }
    }
});

console.log(`[DEBUG] Listener Count for messageCreate: ${client.listenerCount('messageCreate')}`);

const userLocks = new Map();
const rrCache = new Map();

client.on('messageReactionAdd', async (reaction, user) => {
    if (user.bot) return;

    const { message, emoji } = reaction;

    // Ensure the reaction is fully cached
    if (reaction.partial) {
        try {
            await reaction.fetch();
        } catch (error) {
            console.error('Failed to fetch reaction:', error);
            return;
        }
    }
    
    const cacheKey = `${message.guild.id}_${message.id}`;
    let reactionRole = rrCache.get(cacheKey);

    if (!reactionRole) {
        reactionRole = await RR.findOne({
            guildId: message.guild.id,
            messageId: message.id,
            "reactions.emoji": emoji.toString(),
        });

        if (reactionRole) {
            const roleId = reactionRole.reactions.find(r => r.emoji === emoji.toString())?.roleId;
            const role = message.guild.roles.cache.get(roleId);
            const member = message.guild.members.cache.get(user.id);
            const botMember = message.guild.members.cache.get(client.user.id);

            if (!role || !member) return;
            rrCache.set(cacheKey, reactionRole);
            
            if (userLocks.has(user.id)) return; // skip if user already being processed

            userLocks.set(user.id, true);

            try {
                await member.roles.add(role);
                await userLocks.delete(user.id);
            } catch (error) {
                console.error(`Failed to add role to ${user.tag}:`, error);
            }

            // auto-expire cache after 30s
            setTimeout(() => rrCache.delete(cacheKey), 2_00);
        }
    }

});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user.bot) return;

    const { message, emoji } = reaction;

    // Ensure the reaction is fully cached
    if (!reaction.partial) {
        await reaction.fetch().catch(console.error);
    }

    // Fetch the reaction role configuration
    const reactionRole = await RR.findOne({
        guildId: message.guild.id,
        messageId: message.id,
        "reactions.emoji": emoji.toString(),
    });

    if (reactionRole) {
        const roleId = reactionRole.reactions.find(r => r.emoji === emoji.toString())?.roleId;
        const role = message.guild.roles.cache.get(roleId);
        const member = message.guild.members.cache.get(user.id);

        if (!role || !member) return;

        try {
            await member.roles.remove(role);
        } catch (error) {
            console.error(`Failed to remove role: ${error}`);
        }
    }
});


// Voice State
client.on("voiceStateUpdate", async (oldState, newState) => {
    if (!newState.channelId) return; // User keluar dari voice channel

    // Ambil konfigurasi join-to-create dari database
    const config = await GuildConfig.findOne({ guildId: newState.guild.id });
    if (!config || !config.joinToCreate.length) return;

    // Cari konfigurasi yang sesuai dengan channel yang user masuki
    const jtcConfig = config.joinToCreate.find(jtc => jtc.baseChannelId === newState.channelId);
    if (!jtcConfig) return;

    // Ambil kategori dari konfigurasi
    const category = newState.guild.channels.cache.get(jtcConfig.category);
    if (!category || category.type !== 4) return; // Pastikan kategori valid (4: kategori)

    const user = newState.member;
    const channelName = jtcConfig.channelNameTemplate.replace("{user}", user.displayName);

    // Buat channel baru
    const newChannel = await newState.guild.channels.create({
        name: channelName,
        type: 2, // Voice channel
        // userLimit: 4,
        parent: category.id,
        bitrate: Math.min(newState.guild.maximumBitrate, 96000),
        permissionOverwrites: [
            {
                id: newState.guild.id, // Semua member
                deny: [PermissionFlagsBits.Connect]
            },
            {
                id: user.id, // Pemilik channel
                allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ViewChannel]
            }
        ]
    });

    // Pindahkan user ke channel baru
    await user.voice.setChannel(newChannel);

    // Fungsi untuk membersihkan channel kosong
    const cleanup = async () => {
        if (newChannel.members.size === 0) {
            try {
                await newChannel.delete("Join-to-create cleanup");
            } catch (error) {
                console.error(`Failed to delete channel: ${newChannel.id}`, error.message);
            }
        }
    };

    // Tambahkan event listener untuk membersihkan
    client.on("voiceStateUpdate", async (oldVoiceState, newVoiceState) => {
        if (oldVoiceState.channelId === newChannel.id && newChannel.members.size === 0) {
            cleanup();
        }
    });

    // Hapus otomatis setelah 1 menit jika tetap kosong
    setTimeout(cleanup, 60000); // 1 menit
});

// YOUTUBE
const youtubeHandler = require("./src/lib/youtubeHandler");
async function checkYoutube() {
    await youtubeHandler(client);
    setInterval(() => youtubeHandler(client), 1 * 60 * 1000);
}
const streamMonitor = require('./src/lib/streamHandler.js');
async function checkYtMonitor() {
    await streamMonitor(client);
    setInterval(() => streamMonitor(client), 1 * 60 * 1000);
}
const ytPremiereHandler = require("./src/lib/ytPremiereHandler.js");
async function checkYtPremiere() {
    await ytPremiereHandler(client);
    setInterval(() => ytPremiereHandler(client), 2 * 60 * 1000);
}

// TWITCH
const twitchHandler = require('./src/lib/twitchHandler.js');
async function checkTwitch() {
    await twitchHandler(client);
    setInterval(() => twitchHandler(client), 5 * 60 * 1000);
}

//TWITTER


const RSS_URL = "https://nitter.kabii.moe/vestiazeta/rss";
const TWEETS_FILE = './tweets.json'; // File untuk menyimpan tweet yang sudah dikirim

const Parser = require('rss-parser');
const parser = new Parser({
  requestOptions: {
    timeout: 60000 // Waktu timeout dalam milidetik (contoh: 5000 ms = 5 detik)
  }
});
const twitter_instance = ["nitter.kabii.moe", "nitter1.kabii.moe"];
const youtube_instance = ["youtube.com", "youtu.be", "www.youtube.com", "m.youtube.com"];
const youtubeRegex = new RegExp(youtube_instance.map(instance => instance.replace('.', '\\.')).join('|'), 'i');

// Translation module
// const translate = require('google-translate-api-x');
const { MET } = require("bing-translate-api");
const TLSwitch = 'on';

function loadSavedTweets() {
    if (!fs.existsSync(TWEETS_FILE)) {
        fs.writeFileSync(TWEETS_FILE, JSON.stringify({}), 'utf8');
    }
    const data = fs.readFileSync(TWEETS_FILE, 'utf8');
    return JSON.parse(data);
}

/**
 * Save tweets data to file.
 * @param {Object} data - The tweets data to save.
 */
function saveTweets(data) {
    fs.writeFileSync(TWEETS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAvatarURL(username) {
  const url = `https://unavatar.io/twitter/${username}?fallback=https://pbs.twimg.com/sticky/default_profile_images/default_profile_normal.png`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('No avatar found');
    return url;
  } catch (e) {
    return 'https://api.dicebear.com/7.x/thumbs/svg?seed=' + username;
  }
}

const rssUsers = {
    "DeltorielVT": ["1392129596777955328"],
    "SilviaValleria": ["1358785368647929873"],
    "pingumoroll": ["1357360035772240023"],
    "HaliChrysaora": ["1346175755318722641"],
    "LyannaChernovs": ["1406109100881870858"]
}

/**
 * Fetch the latest tweet and send to Discord if not sent before.
 */
async function fetchAndSendLatestTweet() {
	const guildId = "789097277141811230";
    	for (const [username, channelIds] of Object.entries(rssUsers)) {
    			try {
    			await pause(5000);
                const feed = await parser.parseURL(`https://nitter1.kabii.moe/${username}/rss`);
    			// console.log(`[${getCurrentFormattedTime()}] > Processing tweet feeds for: ` + twitterConfigs.username);
    				
    			    if (feed.items && feed.items.length > 0) {
    					
    					//const twitterConfigs = await TwitterConfig.find({ username: { $exists: true } });
    					//if (twitterConfigs.length === 0) continue;
    //					const twitterFeatures = await TwitterFeature.find({ username: cfg.username, guildId: guildId });
    //					if (twitterFeatures.length === 0) continue;
    						
    					// const feed = await parser.parseURL(`https://nitter.poast.org/${config.username}/rss`);
    					// console.log('Processing: ' + config.username);
    					// console.log(feed)
    					// console.log(feed.items[4]);
    					const savedTweets = loadSavedTweets();
    								
    					if (!savedTweets[guildId]) {
    						savedTweets[guildId] = {};
    					}
    					if (!savedTweets[guildId][username]) {
    						savedTweets[guildId][username] = {};
    					}
    							
    					// const latestTweets = feed.items.splice(0, 3);
    					// const maxTweets = 3; // Batasi jumlah tweet
    					// const latestTweets = feed.items.slice(0, 0 + maxTweets);
    				    const latestTweets = feed.items.splice(0, 5).sort((a, b) => new Date(a.isoDate) - new Date(b.isoDate));
    									
    					for (const latestTweet of latestTweets) {
    						let tweetId = "";
    						if (latestTweet.link && latestTweet.link.includes("status/")) {
    							tweetId = latestTweet.link.split("status/")[1];
    						}
    						
    						const tweetUser = feed.image;
    						// let tweetId = latestTweet.link.split("/status/")[1].trim() // generateRandomKey(latestTweet.link);
    											
    						// Check if the tweet was already sent
    						if (savedTweets[guildId][username][tweetId.split('#')[0].trim()]) {
    							// console.log(`Tweet already sent for ${config.username} in guild ${guildId}: ${tweetId.split('#')[0].trim()}. Skipping...`);
    							continue;
    						}
    
    						// Check if the tweet is a retweet
    						const isRetweet = latestTweet.title.includes("RT by ");
    						const isReply = latestTweet.title.includes('R to ');
    						const latestContent = decodeHtmlEntities(latestTweet.content);
    						const latestTitle = decodeHtmlEntities(latestTweet.title);
    						const media = extractMediaFromContent(latestTweet.content);
    						const medias = media?.length;
    													
    						let translatedContent = null;
    						let translatedTitle = null;
    						let konten = null;
    						let titel = null;
    						let tlFooter = null;	
    											
    			            const translation = false;
    						if (translation === true) {
    							// Tranlate content
    							try {
    								const detection = await MET.translate(latestContent, null, 'id');
    								// console.log('Translation response:', detection[0].translations);
    									
    								// Fallback for language detection
    								const sourceLang = detection[0].detectedLanguage.language;
    								if (sourceLang !== 'id') {
    									translatedContent = cleanText(detection[0].translations[0].text);
    									tlFooter = `Translated by Microsoft, ${sourceLang} -> id`
    								}
    							} catch (error) {
    								console.error('Error translating content:', error);
    							}
    														
    							// Tranlate title
    							try {
    								const detectionTitle = await MET.translate(latestTitle, null, 'id');
    								// console.log('Translation response:', detectionTitle[0].translations);
    														
    									// Fallback for language detection
    								const sourceLang = detectionTitle[0].detectedLanguage.language;
    								if (sourceLang !== 'id') {
    									translatedTitle = cleanText(detectionTitle[0].translations[0].text);
    									tlFooter = `Translated by Microsoft, ${sourceLang} -> id`
    								}
    							} catch (error) {
    								console.error('Error translating content:', error);
    							}
    						}
    
    						// Parse tweet details
    						let tweet = {};
    						let quoteId = null;
    						let quoteId2 = null;
    					    let quoteIdRep = null;
    						let quotedTweet = null;
    						if (latestTweet.content.includes("status/")) {
    						    const quotedLinkRegex = latestTweet.content.match(/https:\/\/nitter1\.kabii\.moe\/[\w\d_]+\/status\/\d+/);
    						    quotedLinkFix = quotedLinkRegex[0].replace("https://nitter1.kabii.moe/", "https://x.com/");
    						}
    						if (isRetweet === true) {
    							const quoteUser = latestTweet.link.split("nitter1.kabii.moe/")[1].split("/status")[0].trim();
    							const vidFooter = latestTweet.content.includes('.mp4') ? "(Open on X to view video)" : null;
    							const TLfooter = tlFooter ? tlFooter : null;
    							let fixFooter = null;
    														
    							if (vidFooter) {
    								fixFooter = `${vidFooter}`;
    							} else {
    								fixFooter = null;
    							}
    														
    							const yturl = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTweet.title.split(youtubeRegex)[1]?.split('\n')[0] : null;
    							const liveDesc = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTitle.slice(latestTitle.indexOf(':') + 1).trim() : latestContent;
    													
    							if (latestTweet.contentSnippet.includes("nitter1.kabii.moe/")) {
    								// Extract part of the content after "nitter.poast.org/"
    								const snippet = latestTweet.contentSnippet.split("nitter1.kabii.moe/")[1].trim();
    														
    								if (snippet) {
    									// Extract the status ID
    									quoteId = snippet.split("status/")[1]?.split("#")[0].trim();
    									// console.log("quoteId: ", quoteId)
    								}
    							}
    
    							// console.log({ quoteId, quoteUser });
    							tweet = {
    								username: extractUsernameFromFeed(feed),
    								//title: decodeHtmlEntities(latestTweet.title),
    								text: cleanText(liveDesc),
    								link: tweetId.split('#')[0].trim(), // latestTweet.link,
    								media: medias > 0 ? media[0] : null, //extractMediaFromContent(latestTweet.content),
    								timestamp: latestTweet.isoDate,
    								isRetweet: true, // Mark as retweet if a quote ID is present
    								userPfp: `${tweetUser.url}`,
    								quotedPfp: 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp',
    								quotedTweet: quoteId ? quotedLinkFix : null,
    								// quotedTweet: quoteId ? `https://twitter.com/${extractUsernameFromFeed(feed)}/status/${quoteId}` : null,
    								quotedUser: quoteUser,
    								footer: fixFooter,
    								ytlive: yturl,
    							};
    						} else if (!isRetweet) {
    							const quoteUser = latestTweet.contentSnippet.includes("nitter1.kabii.moe/") ? latestTweet.contentSnippet.split("nitter1.kabii.moe/")[1].split("/status")[0].trim() : null;
    							const vidFooter = latestTweet.content.includes('.mp4') ? "(Open on X to view video)" : null;
    							const TLfooter = tlFooter ? tlFooter : null;
    							let fixFooter = null;
    														
    							if (vidFooter && TLfooter) {
    								fixFooter = `${vidFooter} | ${TLfooter}`;
    							} else if (!vidFooter && TLfooter) {
    								fixFooter = TLfooter;
    							} else if (vidFooter && !TLfooter) {
    								fixFooter = vidFooter;
    							} else if (!vidFooter && !TLfooter) {
    								fixFooter = null;
    							}
    														
    							if (latestTweet.contentSnippet.includes("nitter1.kabii.moe/")) {
    								// Extract part of the content after "nitter.poast.org/"
    								const snippet = latestTweet.contentSnippet.split("nitter1.kabii.moe/")[1].trim();
    														
    								if (snippet) {
    									// Extract the status ID
    									quoteId2 = snippet.split("status/")[1]?.split("#")[0].trim();
    									// console.log("quoteId2: ", quoteId2)
    								}
    							}
    														
    							const yturl = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTweet.title.split(youtubeRegex)[1]?.split('\n')[0] : null;
    							const liveDesc = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTitle : latestContent;
    														
    							tweet = {
    								username: extractUsernameFromFeed(feed),
    								text: cleanText(liveDesc),
    								link: tweetId.split('#')[0].trim(), // latestTweet.link,
    								media: medias > 0 ? media[0] : null, // extractMediaFromContent(latestTweet.content),
    								timestamp: latestTweet.isoDate,
    								isRetweet: false,
    								userPfp: `${tweetUser.url}`,
    								quotedPfp: 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp',
    								quotedUser: quoteUser ? quoteUser : null,
    								quotedTweet: quoteId2 ? quotedLinkFix : null,
    								// quotedTweet: quoteId2 ? `https://twitter.com/${quoteUser}/status/${quoteId2}` : null,
    								footer: fixFooter,
    								ytlive: yturl,
    							};
    						}
    													
    						if (isReply === true) {
    						    const quoteUser = latestTweet.contentSnippet.includes("nitter1.kabii.moe/") ? latestTweet.contentSnippet.split("nitter1.kabii.moe/")[1].split("/status")[0].trim() : null;
    						    
    							const vidFooter = latestTweet.content.includes('.mp4') ? "(Open on X to view video)" : null;
    							const TLfooter = tlFooter ? tlFooter : null;
    							let fixFooter = null;
    														
    							if (vidFooter && TLfooter) {
    								fixFooter = `${vidFooter} | ${TLfooter}`;
    							} else if (!vidFooter && TLfooter) {
    								fixFooter = TLfooter;
    							} else if (vidFooter && !TLfooter) {
    								fixFooter = vidFooter;
    							} else if (!vidFooter && !TLfooter) {
    								fixFooter = null;
    							}
    							
    							if (latestTweet.contentSnippet.includes("nitter1.kabii.moe/")) {
    								// Extract part of the content after "nitter.poast.org/"
    								const snippet = latestTweet.contentSnippet.split("nitter1.kabii.moe/")[1].trim();
    														
    								if (snippet) {
    									// Extract the status ID
    									quoteIdRep = snippet.split("status/")[1]?.split("#")[0].trim();
    									// console.log("quoteId2: ", quoteId2)
    								}
    							}
    														
    							const yturl = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTweet.title.split(youtubeRegex)[1]?.split('\n')[0] : null;
    							const liveDesc = youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? latestTitle.slice(latestTitle.indexOf(':') + 1).trim() : latestContent;
    														
    							const userReplied = latestTweet.title.split('R to @')[1].split(':')[0];
    							tweet = {
    								username: extractUsernameFromFeed(feed),
    								repliedUser: userReplied,
    								text: `@${userReplied} ${cleanText(liveDesc)}`,
    								link: tweetId.split('#')[0].trim(),
    								media: medias > 0 ? media[0] : null, // extractMediaFromContent(latestTweet.content),
    								timestamp: latestTweet.isoDate,
    								isRetweet: 'reply',
    								userPfp: `${tweetUser.url}`,
    								quotedUser: quoteUser ? quoteUser : null,
    								quotedTweet: quoteIdRep ? quotedLinkFix : null,
    								ytlive: yturl,
    								footer: fixFooter,
    							}
    						}
    
    						// Send tweet to Discord
    						//await sendTweetEmbed(tweet);
    						//console.log("Tweet Located: ", tweet);
    													
    						try {
    							for (const channelId of channelIds) {
    							const channelDC = client.channels.cache.get(channelId);
    							// console.log(tweet);
    														
    							const embed = new EmbedBuilder()
    								.setColor('#1DA1F2');
    														
    							if (tweet.isRetweet === true) {
    							    const avatarURL = await getAvatarURL(tweet.quotedUser);
    								embed.setAuthor({ 
    									name: `@${tweet.quotedUser}`, 
    									url: `https://x.com/${tweet.quotedUser}`, 
    									iconURL: avatarURL
    								});
    								embed.setFooter({ text: tweet.footer, iconURL: tweet.footer ? (tweet.footer.includes('video') ? 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp' : null) : null })
    								if (tweet.quotedTweet) {
    									embed.addFields({ name: 'Post Quoted', value: tweet.quotedTweet });
    									if (tweet.text) {
    										embed.setDescription(tweet.text?.split("nitter1.kabii.moe/")[0].trim());
    									}
    								} else {
    									if (tweet.text) {
    										embed.setDescription(tweet.text)
    									}
    								}
    								
    							} else if (tweet.isRetweet === false) {
    								embed.setAuthor({ 
    									name: `@${tweet.username}`, 
    									url: `https://x.com/${tweet.username}`, 
    									iconURL: tweet.userPfp.replace('https://nitter1.kabii.moe/pic/', 'https://').replace(/%2F/g, '/')
    								});
    								embed.setFooter({ text: tweet.footer, iconURL: tweet.footer ? (tweet.footer.includes('video') ? 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp' : null) : null })
    								if (tweet.text) {
    									if (tweet.text?.includes("nitter1.kabii.moe/")) {
    										const fieldLink = tweet.text?.split("/status/")[1];
    										const fieldLinkFix = fieldLink.split('#')[0];
    										embed.setDescription(`@${tweet.quotedUser} ${tweet.text?.split("nitter1.kabii.moe")[0]}`);
    										embed.addFields({ name: "Post Quoted", value: `https://x.com/${tweet.quotedUser}/status/${fieldLinkFix}` });
    									} else {
    										embed.setDescription(tweet.text)
    									}
    								}
    								
    								if (translatedTitle || translatedContent) {
    								    if (tweet.text?.includes("nitter1.kabii.moe/")) {
    									    const valueFix = youtube_instance.some(instance => translatedContent.includes(instance) || translatedTitle.includes(instance)) ? translatedTitle.slice(translatedTitle.indexOf(':') + 1).trim() : translatedContent;
    									    const values = valueFix.split("nitter1.kabii.moe")[0];
    									    embed.addFields({ name: 'Translated Content', value: `@${tweet.quotedUser} ${values}` });
    								    } else {
    									    embed.addFields({ name: 'Translated Content', value: youtube_instance.some(instance => latestTweet.content.includes(instance) || latestTweet.title.includes(instance)) ? translatedTitle : translatedContent })
    								    }
    							    }
    								
    							}
    													
    							if (tweet.isRetweet === 'reply') {
    								embed.setAuthor({ 
    									name: `@${tweet.username}`, 
    									url: `https://x.com/${tweet.username}`, 
    									iconURL: tweet.userPfp.replace('https://nitter1.kabii.moe/pic/', 'https://').replace(/%2F/g, '/')
    								});
    								embed.setFooter({ text: tweet.footer, iconURL: tweet.footer ? (tweet.footer.includes('video') ? 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp' : null) : null });
    								
    								if (tweet.quotedTweet) {
    									if (tweet.text) {
    										embed.setDescription(tweet.text?.split("nitter1.kabii.moe")[0].trim());
    									}
    								} else {
    									if (tweet.text) {
    										embed.setDescription(tweet.text)
    									}
    								}
    								
    								if (translatedTitle || translatedContent) {
    								    if (tweet.text?.includes("nitter1.kabii.moe")) {
    								        const valueFix = youtube_instance.some(instance => translatedContent.includes(instance) || translatedTitle.includes(instance)) ? `@${tweet.repliedUser} ${translatedTitle.slice(translatedTitle.indexOf(':') + 1).trim()}` : `@${tweet.repliedUser} ${translatedContent}`;
    									    const values = valueFix.split("nitter1.kabii.moe")[0];
    									    embed.addFields({ name: 'Translated Content', value: values });
    								    } else {
        						            embed.addFields({ name: 'Translated Content', value: youtube_instance.some(instance => translatedContent.includes(instance) || translatedTitle.includes(instance)) ? `@${tweet.repliedUser} ${translatedTitle.slice(translatedTitle.indexOf(':') + 1).trim()}` : `@${tweet.repliedUser} ${translatedContent}` });
        						        }
    							    }
    								
    							}
    													
    							let content = "";
    							// Format content differently for retweets
    							if (latestTweet.content) {
    								if (tweet.text?.includes("nitter1.kabii.moe/")) {
    									content = tweet.isRetweet
    										? `**@${tweet.username}** reposted **@${tweet.quotedUser}** \uD83D\uDD01 : https://x.com/${tweet.username}/status/${tweet.link}`
    										: `**@${tweet.username}** quoted a post from **@${tweet.quotedUser}** \uD83D\uDDE8 <t:${new Date(tweet.timestamp).getTime() / 1000}:R>: https://x.com/${tweet.username}/status/${tweet.link}`;
    								} else { 
    									content = tweet.isRetweet
    										? `**@${tweet.username}** reposted **@${tweet.quotedUser}** \uD83D\uDD01 : https://x.com/${tweet.username}/status/${tweet.link}`
    										: `**@${tweet.username}** made a new post <t:${new Date(tweet.timestamp).getTime() / 1000}:R>: https://x.com/${tweet.username}/status/${tweet.link}`;
    								}
    							}
    														
    							if (tweet.isRetweet === 'reply') {
    								content = `**@${tweet.username}** replied to a post from **@${tweet.repliedUser}** \uD83D\uDCAC <t:${new Date(tweet.timestamp).getTime() / 1000}:R>: https://x.com/${tweet.username}/status/${tweet.link}`
    							}
    													
    							let fixContent = "";
    							const roleId = null;
    							if (roleId === null) {
    								fixContent = `${content}`;
    							} else {
    							    if (tweet.text?.includes("nitter1.kabii.moe/")) {
    								    fixContent = content
    								} else {
    								    fixContent = tweet.isRetweet ? content : `<@&${roleId}> ${content}`;
    								}
    							}
    							
    							const videoUrl = parseTweetVideo(latestTweet.content);
    							// console.log("Parsed videoUrl:", videoUrl);
    														
    							if (tweet.media) {
    								if (tweet.media.includes("jpg") || tweet.media.includes("png")) {
    									// For images (jpg or png)
    									embed.setImage(tweet.media.replace("nitter1.kabii.moe/pic/", 'pbs.twimg.com/').replace(/%2F/g, "/"));
    															
    									if (medias > 1) {
    										embed.setFooter({ text: `(Open in X to view ${medias} images)`, iconURL: 'https://icon2.cleanpng.com/20240402/qxh/transparent-x-logo-monogram-black-and-white-abstract-intersect-abstract-black-and-white-monogram-with-x660c83cac511e3.72756345.webp' });
    									}
    															
    									if (channelDC) {
    										await channelDC.send({
    											content: fixContent,
    											embeds: [embed],
    										});
    										if (videoUrl) {
        										await channelDC.send({
        										    content: videoUrl
        										});
    										}
    									} else {
    										console.log(`Channel for Tweet not found: `, ceneldc)
    									}
    								} /* else if (tweet.media.includes("mp4")) {
    															// For videos (mp4)
    															let videoUrl = tweet.media.replace("nitter.poast.org/pic/", 'pbs.twimg.com/').replace(/%2F/g, "/");
    																
    															// Set video thumbnail (if available)
    															const videoThumbnail = videoUrl.replace(".mp4", ".jpg"); // Example: Replace mp4 with jpg for thumbnail
    															embed.setImage(videoThumbnail);
    																
    															if (channelDC) {
    																await channelDC.send({
    																	content: fixContent,
    																	embeds: [embed],
    																});
    															}
    														} */
    							} else {
    								if (channelDC) {
    									await channelDC.send({
    										content: fixContent,
    										embeds: [embed],
    									});
    									if (videoUrl) {
        									await channelDC.send({
        										content: videoUrl
        									});
    							        }
    								}
    							}
    						}
    													
    				    } catch (error) {
    						console.error(`[${getCurrentFormattedTime()}] Error catch: `, error)
    						console.log('Generated Author URL:', `https://x.com/${tweet.username}`);
    					}
    
    					// Save the tweet to avoid sending it again
    					savedTweets[guildId][username][tweetId.split('#')[0].trim()] = true;
    					saveTweets(savedTweets);
    
    						//console.log('Tweet sent and saved:', tweetId.split('#')[0].trim());
    						//console.log(`[${getCurrentFormattedTime()}] > Fetching for ${config.username}: ${tweetId.split('#')[0].trim()} - Done - Continue...`);
    				}
    			}
    		} catch (error) {
    			console.error(`[${getCurrentFormattedTime()}]Error fetching tweets for ${username}: `, error);
    			continue;
    		}
    	}
}

/**
 * Generate a random key for a tweet.
 * @param {string} input - Input value (e.g., tweet link).
 * @returns {string} - A random key.
 */
function generateRandomKey(input) {
    return `${input}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract the username from the RSS feed.
 * @param {Object} feed - RSS feed object.
 * @returns {string} - The username.
 */
function extractUsernameFromFeed(feed) {
    return feed.title.split(" / @")[1]; // Example: "Twitter / vestiazeta" => "vestiazeta"
}

/**
 * Clean up the text from RSS item content.
 * @param {string} text - Raw text from RSS item content.
 * @returns {string} - Cleaned text.
 */
function cleanText(text) {
    return text.replace(/<[^>]+>/g, '').trim(); // Remove HTML tags
}

/**
 * Extract media (image/video) URL from the RSS content.
 * @param {string} content - Raw HTML content from RSS item.
 * @returns {string|null} - Media URL if available, or null.
 */
function extractMediaFromContent(content) {
    // Try matching an image URL
    const imgMatches = content.match(/<img src="([^"]+)"/g);
    if (imgMatches) {
        const imgUrls = imgMatches.map(match => match.match(/<img src="([^"]+)"/)[1]);
        return imgUrls;
    }

    // If no image is found, try matching a video URL
    const videoMatch = content.match(/<video src="([^"]+)"/);
    if (videoMatch) {
        return videoMatch[1]; // Return the video URL if found
    }

    // If neither is found, return null
    return null;
}

function parseTweetVideo(item) {
  if (!item.includes("<video")) return null;

  const match = item.match(/<source src="([^"]+\.mp4)"/);
  if (!match) return null;

  const decoded = decodeURIComponent(match[1]);
  // cari ID mp4
  const idMatch = decoded.match(/tweet_video\/([^\/]+\.mp4)/);
  if (!idMatch) return null;

  return `https://video.twimg.com/tweet_video/${idMatch[1]}`;
}

async function checkTweets() {
	await fetchAndSendLatestTweet();
	setInterval(fetchAndSendLatestTweet, 15 * 60 * 1000);
}

// Handle process exit
process.on('exit', () => {
    console.log('Bot is shutting down...');
});

process.on('SIGINT', () => {
    client.destroy();
    process.exit();
});
