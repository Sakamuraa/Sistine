module.exports = {
    name: "servers",
    description: "shows all servers",
    devOnly: true,

    execute: async (message, args) => {
        const guilds = message.client.guilds.cache;
        const guildList = guilds.map(guild => `- ${guild.name} \`(ID: ${guild.id})\``).join('\n');

        if (guildList.length === 0) {
            await message.channel.send('Bot tidak berada di guild manapun.');
        } else {
            await message.channel.send(`Bot berada di ${guilds.size} guild:\n${guildList}`);
        }
    }
}