const { 
    ApplicationCommandOptionType,
    ChannelType,
    PermissionFlagsBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const { getLevel, getLeaderboard } = require('../../Utils/leveling.js');

module.exports = {
    name: "level",
    description: "Check your level.",
    cyberlife: true,
    options: [
        {
            name: "info",
            description: "Check your current level.",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "leaderboard",
            description: "Check TOP 10 leaderboard.",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    botPermissions: PermissionFlagsBits.SendMessages,
    
    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "info") {
            if (!(interaction.guild.id === "789097277141811230")) return interaction.reply({ content: "This command is only available in [The Cyberlife](https://discord.gg/ytBsd5JSXB) server.", ephemeral: true });
        
            const userLevel = getLevel(interaction.guild.id, interaction.user.id);
            const xpNeeded = userLevel.level * 125;

            const embed = new EmbedBuilder()
                .setTitle(`Informasi Level & XP`)
                .setColor("#cc345a")
                .setDescription(`<@${interaction.user.id}> (${interaction.user.username}), berikut adalah informasi level dan xp mu.`)
                .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: "Teruslah aktif untuk naik level lebih cepat!" });
            
            /* if (interaction.user.id === "880055530721247253") {
                embed.addFields(

                    { name: `🎮 Level`, value: `- **INFINITY**`, inline: false },

                    { name: `⚡ Current XP`, value: `- **INFINITY**`, inline: false }

                )
            } else { */
                embed.addFields(

                    { name: `🎮 Level`, value: `- **${userLevel.level}**`, inline: false },

                    { name: `⚡ Current XP`, value: `- **${userLevel.xp}**\n\nNaik level: **${xpNeeded - userLevel.xp} XP**`, inline: false }

                )
            //}

            interaction.reply({ embeds: [embed] });
        }

        if (subcommand === "leaderboard") {
            if (!(interaction.guild.id === "789097277141811230")) return interaction.reply({ content: "This command is only available in [The Cyberlife](https://discord.gg/ytBsd5JSXB) server.", ephemeral: true });
            
            const guildId = interaction.guild.id;
            const leaderboard = getLeaderboard(guildId);

            if (leaderboard.length === 0) {
                return interaction.reply("❌ Leaderboard masih kosong.");
            }

            const leaderboardText = leaderboard.map((user, index) => 
                `**${index + 1}.** <@${user.userId}> - Level ${user.level}`
            ).join("\n");

            const embed = new EmbedBuilder()
                .setTitle(`🏆 Leaderboard Level 🏆`)
                .setColor("#cc345a")
                .setDescription("Berikut adalah peringkat level di server ini.")
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setFooter({ text: "Teruslah aktif untuk menaiki peringkat!" })
                .addFields({
                    name: `Leaderboard`,
                    value: leaderboardText,
                    inline: false
                });

            interaction.reply({ embeds: [embed] });
        }

    }
}