const { YoutubeChannel } = require('../database/mongoose');

module.exports = {
    name: 'list-guilds',  // Nama command
    description: 'Menampilkan daftar guild tempat bot berada',
    devOnly: true,
    // testOnly: false,
    
    execute: async (message, args) => {
        const youtubeChannels = await YoutubeChannel.find({ channelId: { $exists: true } });
        const channelList = youtubeChannels.map(youtubeChannel => `- ${youtubeChannel.name} \`(ID: ${youtubeChannel.channelId})\``).join('\n');
        await message.channel.send(`List of YouTube channels:\n${channelList}`);
    }
};
