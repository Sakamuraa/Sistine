const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const guildPath = path.join('./src/database', "reminderGuilds.json");
const userPath = path.join('./src/database', "userReminder.json");

const reminders = new Map()
const cooldowns = {
    hunt: 15000,
    battle: 15000,
    pray: 300000,
    curse: 300000,
    owo: 10000
};

const guildReminders = JSON.parse(fs.readFileSync(guildPath));
const userPrefs = JSON.parse(fs.readFileSync(userPath));

function sendReminder(client, type, userId, username, channelId, cooldown) {
    setTimeout(async () => {
        try {
            if (!userPrefs[userId]) {
                userPrefs[userId] = {
                    hunt: true,
                    pray: true,
                    owo: true,
                    mention: {
                        hunt: true,
                        pray: true,
                        owo: true
                    }
                }
            }
            
            let key;
            if (type.toLowerCase().includes("hunt")) key = "hunt";
            else if (type.toLowerCase().includes("pray")) key = "pray";
            else if (type.toLowerCase().includes("owo")) key = "owo";
            
            if (userPrefs[userId][key] !== true) return;
            
            const channel = await client.channels.fetch(channelId);
            if (!channel || !channel.isTextBased()) return;
            
            const member = await channel.guild.members.fetch(userId);
			const name = member?.displayName;
            
            const guildId = channel.guildId;
    		if (!guildReminders[guildId]) return;
            
            if (channelId !== "1317889301643661322") return;
            
            const embud = new EmbedBuilder()
            	.setAuthor({ name: name, iconURL: member.displayAvatarURL() })
                .setDescription(`**Sudah waktunya ${type} lagi, jangan bilang kamu udah capek segitu doang… Hmph, aku kecewa padamu.**`)
                .setColor('#06B5A4');
            
            const mention = (userPrefs[userId].mention && userPrefs[userId].mention[key]) ? `<@${userId}>` : `**${username}**`;
            await channel.send({ content: `${mention}, ayo **${type}** lagi...` });

    } catch (err) {
      console.error(`Gagal kirim reminder ke ${userId}:`, err.message);
    }
  }, cooldown);
}

module.exports = async (message, client) => {
    const userId = message.author.id;
    const content = message.content.toLowerCase();
    const now = Date.now();

    if (content === "owo hunt" || content === "owo battle" || content === "owohunt" || content === "owobattle" || content === "owoh" || content === "owob" || content === "wh" || content === "wb") {
        const last = reminders.get(`${userId}-hunt_battle`);
        if (!last || now > last) {
            reminders.set(`${userId}-hunt_battle`, now + cooldowns.hunt);
            sendReminder(client, "hunt/battle :crossed_swords:", userId, message.author.username, message.channel.id, cooldowns.hunt);
        }
    }

    if (content === "owo pray" || content === "owo curse" || content === "owopray" || content === "owocurse" || content === "wpray" || content === "wcurse") {
        const last = reminders.get(`${userId}-pray_curse`);
        if (!last || now > last) {
            reminders.set(`${userId}-pray_curse`, now + cooldowns.pray);
            sendReminder(client, "pray/curse 👻", userId, message.author.username, message.channel.id, cooldowns.pray);
        }
    }

    if (content === "owo") {
        reminders.set(`${userId}-owo`, now + cooldowns.owo);
        sendReminder(client, "OwO 🥰", userId, message.author.username, message.channel.id, cooldowns.owo);
    }
};