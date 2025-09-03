const { devs, testServer, cyberlifeId } = require("../../../config.json");
const getLocalCommands = require("../../Utils/getLocalCommands");
const { EmbedBuilder } = require("discord.js");

module.exports = async (client, interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const localCommands = getLocalCommands();

    try {
        const command = localCommands.find((cmd) => cmd.name === interaction.commandName);

        if (!command) return;

        if (command.devOnly) {
            if (!devs.includes(interaction.user.id)) {
                interaction.reply({ 
                    content: "Only the developers can use this command.", 
                    ephemeral: true 
                });
                return;
            }
        }
        
        if (command.disabled) {
            if (!devs.includes(interaction.user.id)) {
                interaction.reply({
                    embeds: [new EmbedBuilder().setDescription("⚠️ This command was disabled by the Developer, see further information in the [support server](https://discord.gg/Vjsgu3c8B4).").setColor("#77b4e9")],
                    ephemeral: true
                });
                return;
            }
        }

        if (command.testserver || command.cyberlife) {
            const isTestServer = testServer.includes(interaction.guild.id);
            const isCyberlife = cyberlifeId.includes(interaction.guild.id);

            if (!isTestServer && !isCyberlife) {
                return interaction.reply({
                    content: "This command is only available in **The Cyberlife Foundation** or a registered test server.",
                    ephemeral: true
                });
            }
        }

        if (command.permissionsRequired?.length) {
            for (const permission of command.permissionsRequired) {
                if (!interaction.member.permissions.has(permission)) {
                    interaction.reply({ 
                        content: "Anda tidak mempunyai izin untuk menggunakan command ini", 
                        ephemeral: true 
                    });
                    return;
                }
            }
        }

        if (command.botPermissions?.length) {
            for (const permission of command.botPermissions) {
                const bot = interaction.guild.members.me;

                if (!bot.permissions.has(permission)) {
                    interaction.reply({ 
                        content: "Bot tidak mempunyai izin untuk menggunakan command ini", 
                        ephemeral: true 
                    });
                    return;
                }
            }
        }

        if (interaction.isAutocomplete()) {
            const guildId = interaction.guild.id;
    
            // Fetch matching channels from the database
            const channels = await YoutubeChannel.find({ guildId: guildId, channelId: { $exists: true } });
            
            const choices = channels.map(channel => ({
                name: channel.name,
                value: channel.name
            }));
    
            // Filter based on user input (interaction.options.getFocused())
            const focusedValue = interaction.options.getFocused();
            const filteredChoices = choices.filter(choice => 
                choice.name.toLowerCase().includes(focusedValue.toLowerCase())
            );
    
            // Return autocomplete suggestions
            await interaction.respond(
                filteredChoices.map(choice => ({ name: choice.name, value: choice.value }))
            );
        }

        await command.execute(client, interaction);
    } catch (error) {
        console.log(`Ada masalah saat mengeksekusi command ${interaction.commandName}`, error);
    }
};