const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const youtubeVideosStatus = 'https://www.googleapis.com/youtube/v3/videos?part=status';
const youtubeVideosApiUrl = 'https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails';
const { getDuration } = require('../Utils/helpers');
const { fetchWithThrottle, getYoutubeApiKey } = require('../../KeyHandler/getYoutubeApiKey');
// const cookies = require('../../cookies.txt');

// Path to stream messages JSON file
const endStream = path.join(__dirname, '../../data/streamMessages.json');

function getCurrentFormattedTime() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to read the JSON file
function readStreamMessages() {
    try {
        const data = fs.readFileSync(endStream, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading streamMessages.json:', error);
        return {};  // Return an empty object if the file doesn't exist or is corrupt
    }
}

// Helper function to write to the JSON file
function writeStreamMessages(data) {
    try {
        fs.writeFileSync(endStream, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Error writing to streamMessages.json:', error);
    }
}

function updateStreamStatus(videoId, status) {
    const streamMessages = readStreamMessages();  // Read current data from the JSON file

    if (streamMessages[videoId]) {
        // Update the status field for the given videoId
        streamMessages[videoId].status = status;

        // Write the updated data back to the JSON file
        writeStreamMessages(streamMessages);

        // console.log(`[${getCurrentFormattedTime()}] > Updated status for video ${videoId} to ${status}`);
    } else {
        console.error(`Video ID ${videoId} not found in streamMessages.json`);
    }
}

const fetch = require('node-fetch');

async function trackViewers(videoId) {
    const streamMessages = readStreamMessages();

    // Fungsi untuk mengambil data video dari YouTube API
    async function getVideoDetailsFromApi(videoId) {
        const apiKey = getYoutubeApiKey(); // Ambil API Key dari config
        const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`;

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            const data = await response.json();
            if (!data.items || data.items.length === 0) throw new Error("Video not found.");

            return data.items[0].liveStreamingDetails || {};
        } catch (error) {
            throw new Error(`Failed to fetch video details: ${error.message}`);
        }
    }

    try {
        const videoDetails = await getVideoDetailsFromApi(videoId);
        const concurrentViewers = parseInt(videoDetails.concurrentViewers || 0, 10);

        // Tentukan apakah video ini sebelumnya pernah live
        const wasLive = streamMessages[videoId] ? true : false;
        const liveStatus = videoDetails.actualEndTime ? 'ended' : 'is_live';

        if (liveStatus === 'is_live') {
            if (!streamMessages[videoId]) {
                streamMessages[videoId] = { 
                    peakViewers: concurrentViewers, 
                    viewerCounts: [concurrentViewers] 
                };
            } else {
                // Update jumlah penonton
                streamMessages[videoId].viewerCounts.push(concurrentViewers);

                // Perbarui peak viewers jika jumlah penonton saat ini lebih tinggi
                if (concurrentViewers > streamMessages[videoId].peakViewers) {
                    streamMessages[videoId].peakViewers = concurrentViewers;
                }
            }
        } else if (wasLive) {
            if (streamMessages[videoId] && streamMessages[videoId].viewerCounts.length > 0) {
                const lastViewerCount = streamMessages[videoId].viewerCounts.at(-1);
                streamMessages[videoId].viewerCounts = [lastViewerCount];
            }
            console.log(`[${getCurrentFormattedTime()}] > Stream has ended for video ${videoId}`);
        } else {
            console.log(`No live data available for video ${videoId}`);
        }

        writeStreamMessages(streamMessages);
    } catch (error) {
        if (streamMessages[videoId] && streamMessages[videoId].viewerCounts.length > 0) {
            const lastViewerCount = streamMessages[videoId].viewerCounts.at(-1);
            streamMessages[videoId].viewerCounts = [lastViewerCount];
        }
        writeStreamMessages(streamMessages);
        console.error(`[${getCurrentFormattedTime()}] > Error tracking viewers for video ${videoId}: ${error}`);
    }
}

function calculateAverageViewers(videoId) {
    const streamMessages = readStreamMessages();

    const viewersData = streamMessages[videoId];
    if (viewersData && viewersData.viewerCounts.length > 0) {
        const totalViewers = viewersData.viewerCounts.reduce((sum, viewers) => sum + viewers, 0);
        const averageViewers = Math.floor(totalViewers / viewersData.viewerCounts.length);
        return averageViewers.toLocaleString();
    }
    return 0;
}

async function fetchMessage(client, discordChannelId, messageId) {
    try {
        const channel = await client.channels.fetch(discordChannelId);
        if (!channel) {
            console.error(`Channel not found: ${discordChannelId}`);
            return null;
        }

        const botMember = await channel.guild.members.fetch(client.user.id);
        const botPermissions = channel.permissionsFor(botMember);

        if (!botPermissions.has('VIEW_CHANNEL') || !botPermissions.has('READ_MESSAGE_HISTORY')) {
            console.error(`Bot lacks necessary permissions in channel: ${discordChannelId}`);
            return null;
        }

        const message = await channel.messages.fetch(messageId);
        if (!message) {
            console.error(`Message not found: ${messageId}`);
            return null;
        }

        return message;
    } catch (error) {
        console.error(`Error fetching message: ${error.message}`);
        return null;
    }
}

async function monitorStreamEnd(client) {
    const pollInterval = 120000; // 5 minutes to reduce quota usage

    while (true) {
        let streamMessages;
        try {
            streamMessages = readStreamMessages();
        } catch (error) {
            console.error("Error reading streamMessages.json:", error);
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            continue;
        }

        const videoIds = Object.keys(streamMessages);

        for (const videoId of videoIds) {
            const videoData = streamMessages[videoId];
            const discordPost = `https://discord.com/api/webhooks/1320413042256773121/JPcMM502hDDX0BLE8cpgFnzQTopez0yitcB6Xrh7G7EkPFOOit-hgPq4lVB4drAuG7tl`;

            if (videoData.status === true) {
                // console.log(`Monitoring Live ID: ${videoId}`);
                try {
                    await trackViewers(videoId);

                    const videoDetailsUrl = `${youtubeVideosApiUrl}&id=${videoId}&key=${getYoutubeApiKey()}`;
                    const videoDetailsJson = await fetchWithThrottle(videoDetailsUrl);

                    if (!videoDetailsJson || !videoDetailsJson.items || videoDetailsJson.items.length === 0) {
                        console.error(`[${getCurrentFormattedTime()}] > Video ${videoId} is unavailable or private.`);
                        
                        const averageViewers = calculateAverageViewers(videoId);
                        const peakViewers = videoData.peakViewers?.toLocaleString() || 0;

                        for (const guildConfig of videoData.monitoredGuilds) {
                            const sentMessage = await fetchMessage(client, guildConfig.discordChannelId, guildConfig.messageId);
                            const logsId = '1320412974199996468';
                            const logsChannel = client.channels.cache.get(logsId);

                            if (!sentMessage) {
                                console.error(`Could not fetch message for video ID ${videoId} in guild ${guildConfig.guildId}`);
                                continue;
                            }

                            const privateEmbed = new EmbedBuilder(sentMessage.embeds[0])
                                .setAuthor({
                                    name: `${sentMessage.embeds[0].author.name.split(" went live!")[0]} was live.`,
                                    iconURL: sentMessage.embeds[0].author.iconURL,
                                    url: sentMessage.embeds[0].author.url,
                                })
                                .setTitle(`No VOD is available.`)
                                .setURL(`https://youtu.be/${videoId}`)
                                .setDescription(`Last video title: ${sentMessage.embeds[0].title}`)
                                .setFooter({
                                    text: 'Stream ended (approximate)',
                                    iconURL: 'https://cdn3.iconfinder.com/data/icons/social-network-30/512/social-06-512.png',
                                })
                                .setImage(null)
                                .setTimestamp()
                                .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`)
                                .setColor('#8a1616');

                            privateEmbed.spliceFields(0, privateEmbed.data.fields.length);
                            privateEmbed.addFields({ name: 'Viewers', value: `${averageViewers} avg. / ${peakViewers} peak` });

                            const privRow = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Link)
                                        .setLabel('No VOD')
                                        .setURL(`https://youtu.be/${videoId}`)
                                        .setDisabled(true),
                                );

                            sentMessage.edit({ embeds: [privateEmbed], components: [privRow] });
                            
                            const logsEmbed = new EmbedBuilder()
                            	.setAuthor({
                                	name: `${sentMessage.embeds[0].author.name}`,
                                    iconURL: null,
                                    url: sentMessage.embeds[0].author.url,
                                })
                                .setTitle(`No VOD is available.`)
                                .setURL(`https://youtu.be/${videoId}`)
                            	.setDescription(`Last video title: ${sentMessage.embeds[0].title}`)
                            	.addFields({ name: 'Viewers', value: `${averageViewers} avg. / ${peakViewers} peak` })
                                .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`)
                                .setColor('#1d3042')
                                .setFooter({ text: 'Ended at' })
                                .setTimestamp();
                                    
                            if (logsChannel) {
                                await logsChannel.send({
                                    content: `⚠ ${sentMessage.embeds[0].author.name}`,
                                    embeds: [logsEmbed]
                                })
                            }
                        }

                        updateStreamStatus(videoId, false);
                        continue;
                    }

                    const liveStreamingDetails = videoDetailsJson.items[0].liveStreamingDetails;

                    if (liveStreamingDetails && liveStreamingDetails.actualEndTime) {
                        const actualStartTime = new Date(liveStreamingDetails.actualStartTime);
                        const actualEndTime = new Date(liveStreamingDetails.actualEndTime);
                        const duration = getDuration(actualStartTime, actualEndTime);
                        const averageViewers = calculateAverageViewers(videoId);
                        const peakViewers = videoData.peakViewers?.toLocaleString() || 0;

                        for (const guildConfig of videoData.monitoredGuilds) {
                            const sentMessage = await fetchMessage(client, guildConfig.discordChannelId, guildConfig.messageId);
                            const logsId = '1320412974199996468';
                            const logsChannel = client.channels.cache.get(logsId);

                            if (!sentMessage) {
                                console.error(`Could not fetch message for video ID ${videoId} in guild ${guildConfig.guildId}`);
                                continue;
                            }

                            const endEmbed = new EmbedBuilder(sentMessage.embeds[0])
                                .setAuthor({
                                    name: `${sentMessage.embeds[0].author.name.split(" went live!")[0]} was live.`,
                                    iconURL: sentMessage.embeds[0].author.iconURL,
                                    url: `${sentMessage.embeds[0].author.url}`,
                                })
                                .setTitle(`${sentMessage.embeds[0].title}`)
                                .setURL(`https://youtu.be/${videoId}`)
                                .setDescription(`Video available: [${duration}]`)
                                .setFooter({
                                    text: 'Stream ended',
                                    iconURL: 'https://cdn3.iconfinder.com/data/icons/social-network-30/512/social-06-512.png',
                                })
                                .setImage(null)
                                .setTimestamp(actualEndTime)
                                .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`)
                                .setColor('#8a1616');

                            endEmbed.spliceFields(0, endEmbed.data.fields.length);
                            endEmbed.addFields({ name: 'Viewers', value: `${averageViewers} avg. / ${peakViewers} peak` });

                            const row = new ActionRowBuilder()
                                .addComponents(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Link)
                                        .setLabel('Replay')
                                        .setURL(`https://youtu.be/${videoId}`),
                                );

                            await sentMessage.edit({
                                embeds: [endEmbed],
                                components: [row],
                            });
                            
                            const logsEmbed = new EmbedBuilder()
                            	.setAuthor({
                                	name: `${sentMessage.embeds[0].author.name}`,
                                    iconURL: sentMessage.embeds[0].author.iconURL,
                                    url: sentMessage.embeds[0].author.url,
                                })
                                .setTitle(`${sentMessage.embeds[0].title}`)
                                .setURL(`https://youtu.be/${videoId}`)
                            	.setDescription(`Video available: [${duration}]`)
                            	.addFields({ name: 'Viewers', value: `${averageViewers} avg. / ${peakViewers} peak` })
                                .setThumbnail(`https://i.ytimg.com/vi/${videoId}/maxresdefault_live.jpg`)
                                .setColor('#1f5280')
                                .setFooter({ text: 'Ended at' })
                                .setTimestamp(actualEndTime);
                                    
                            if (logsChannel) {
                                await logsChannel.send({
                                    content: `⚠ ${sentMessage.embeds[0].author.name}`,
                                    embeds: [logsEmbed]
                                })
                            }
                        }

                        updateStreamStatus(videoId, false);
                    } /* else {
                        console.log(`Stream for video ${videoId} is still live or no end time data.`);
                    } */
                } catch (error) {
                    console.error(`Error monitoring video ID ${videoId}:`, error);
                    continue;
                }
            }
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}


// Exported function to monitor the end of the stream
module.exports =  {
    monitorStreamEnd,
    readStreamMessages,
    writeStreamMessages
}