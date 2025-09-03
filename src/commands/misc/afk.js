const { 
    ApplicationCommandOptionType,
    ChannelType,
    PermissionFlagsBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const { AfkUser } = require("../../database/mongoose");

module.exports = {
    name: "afk",
    description: "Set your status to AFK.",
    options: [
        {
            name: "set",
            description: "Set your AFK status.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "reason",
                    description: "Set your AFK reason.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "list",
            description: "List of all AFK member in this guild.",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    botPermissions: PermissionFlagsBits.Administrator,
    
    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        if (!interaction.guild) return interaction.reply('You\'re not submit a command in a server.');
        
        if (subcommand === "set") {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const reason = interaction.options.getString("reason") || "AFK";
            
            const botMember = interaction.guild.members.me;

            const targetMember = interaction.member;

            try {
                const result = await AfkUser.findOneAndUpdate(
                    { userId, guildId }, // Query to find the existing record
                    { reason, timestamp: new Date() }, // Data to update
                    { upsert: true, new: true } // Upsert and return the updated document
                );

                // Set the user's nickname to [AFK]
                const member = interaction.guild.members.cache.get(userId);
                if (member.roles.highest.position >= botMember.roles.highest.position) {
                    const afkEmbed = new EmbedBuilder()

                        .setDescription(`- **_${member.displayName || member.user.username} is now AFK_** \n\`\`\`Reason: ${reason}\`\`\``)

                         .setColor('#77b4e9');
                    return interaction.reply({

                        content: `⚠️ I can't change your nickname because your role is higher than me. \nBut i have set AFK status for you.`,
                        embeds: [afkEmbed],
                        ephemeral: false

                    });

                }
                
                if (member.id === interaction.guild.ownerId) {
                    const afkEmbed = new EmbedBuilder()

                    .setDescription(`- **_${member.displayName || member.user.username} is now AFK_** \n\`\`\`Reason: ${reason}\`\`\``)

                    .setColor('#77b4e9');
                    return interaction.reply({
                        content: `⚠️ I can't change the server owner's nickname! \nBut I have set AFK status for you.`,
                        embeds: [afkEmbed],
                        ephemeral: false
                    });
                }
                
                if (member) {
                    const currentNickname = member.displayName || member.user.username;
                    const newNickname = `[AFK] ${currentNickname}`;
                    if (!currentNickname.startsWith("[AFK]")) {
                        await member.setNickname(newNickname).catch(error => {
                            console.error(`Failed to update nickname: ${error.message}`);
                        });
                    }
                }
                
                const afkEmbed = new EmbedBuilder()
                    .setDescription(`- **_${member.displayName} is now AFK_** \n\`\`\`Reason: ${reason}\`\`\``)
                    .setColor('#77b4e9');

                await interaction.reply({
                    embeds: [afkEmbed],
                    ephemeral: false
                });
            } catch (error) {
                console.error('Error setting AFK status:', error.message);
                await interaction.reply({ content: 'Failed to set AFK status.', ephemeral: true });
            }
        }
        
        if (subcommand === "list") {
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;
            const member = interaction.guild.members.cache.get(userId);
            
            const database = await AfkUser.find({ guildId: guildId });
            const afkUsers = database.map(user => `- ${interaction.guild.members.cache.get(user.userId)?.displayName} : ${user.reason} (<t:${Math.floor(user.timestamp.getTime() / 1000)}:R>)`).join('\n')
            
            if (database.length > 0) {
                const afkUsers = database.map(user => `- ${interaction.guild.members.cache.get(user.userId)?.displayName || interaction.guild.members.cache.get(user.userId)?.user.username} : ${user.reason} (<t:${Math.floor(user.timestamp.getTime() / 1000)}:R>)`).join('\n');
                
                await interaction.reply({ 
                    content: `**${member.displayName || member.user.username}**, here is the list of members that are AFK:\n\n${afkUsers}`
                })
            } else {
                await interaction.reply({
                    content: `:x: Nobody is AFK.`
                })
            }
        }
    }
}