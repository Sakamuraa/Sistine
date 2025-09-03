const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Path to stream messages JSON file
const endStream = path.join(__dirname, '../../data/statusMessage.json');

// Helper function to read the JSON file
function readStatusMessage() {
    try {
        const data = fs.readFileSync(endStream, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading streamMessages.json:', error);
        return {};  // Return an empty object if the file doesn't exist or is corrupt
    }
}

// Helper function to write to the JSON file
function writeStatusMessage(data) {
    try {
        fs.writeFileSync(endStream, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('Error writing to statusMessage.json:', error);
    }
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

async function statusUpdate(client) {
    const pollInterval = 60000;

    while (true) {
        let statusMessage;
            try {
                statusMessage = readStatusMessage();
            } catch (error) {
                console.error("Error reading statusMessage.json:", error);
                await new Promise(resolve => setTimeout(resolve, pollInterval));  // Wait before retrying
                continue;
            }
    
            // Step 2: Loop through each videoId in streamMessages
            const statusIds = Object.keys(statusMessage);

            for (const statusId of statusIds) {
                const statusData = statusMessage[statusId];

                if (statusData.status === true) {
                    try {
                        const sentMessage = await fetchMessage(client, statusData.discordChannelId, statusData.messageId);

                        const embud = new EmbedBuilder(sentMessage.embeds[0])
                            .setFooter({
                                text:  `Refresh every minute | Updated at`,
                                iconURL: null
                            })
                            .setTimestamp();

                        // console.log('Updated the status message.')
                        sentMessage.edit({ embeds: [embud] })
                    } catch (error) {
                        continue;
                    }
                }
            }

            await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
}

module.exports = {
    statusUpdate
}