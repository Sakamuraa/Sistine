const { EmbedBuilder } = require('discord.js');
const { addXP, saveLevels, getLevel } = require("../../Utils/leveling.js");
const { getRoleForLevel, handleLevelUp } = require('../../Utils/roleConfig.js');

module.exports = async (message, client) => {
    const allowedGuilds = ["789097277141811230"];
    const blockedRoleName = "No EXP";

    if (!allowedGuilds.includes(message.guild.id)) return;

    const member = await message.guild.members.fetch(message.author.id);
    const hasBlockedRole = member.roles.cache.some(role => role.name === blockedRoleName);
    if (hasBlockedRole) return;

    const xpGain = Math.floor(Math.random() * 25) + 15; // XP antara 15-35
    const leveledUp = addXP(message.guild.id, message.author.id, xpGain);

    if (leveledUp) {
        const userLevel = getLevel(message.guild.id, message.author.id);

        const embed = new EmbedBuilder()
            .setDescription(`**Selamat ${message.author}!**`)
            .addFields({ name: "🌟 Level Baru", value: `Anda sekarang di **level ${userLevel.level}**.`, inline: false })
            .setColor("#77b4e9")
            //.setImage('https://tenor.com/bje94.gif')
            .setFooter({ text: "Gas terusin push rank nya!!" })
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }));

        const roleId = getRoleForLevel(message.guild.id, userLevel.level);
        if (roleId) {
            await handleLevelUp(member, userLevel.level);
            embed.addFields({ name: "🎁 Hadiah", value: `Anda mendapatkan role: <@&${roleId}>`, inline: false });
        } else {
            embed.addFields({ name: "🎁 Hadiah", value: "Belum ada hadiah untuk level ini." });
        }

        const levelUpChannel = client.channels.cache.get("1351903851250188401");
        if (levelUpChannel) {
            levelUpChannel.send({ content: `${message.author}`, embeds: [embed] });
        } else {
            console.log(`Level up channel tidak ditemukan.`);
        }

        saveLevels();
    }
};