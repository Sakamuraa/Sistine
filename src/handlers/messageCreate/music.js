const { Player, useQueue } = require('discord-player');

module.exports = async (message, client) => {
    const player = new Player(client);

    if (message.content.startsWith('s!play')) {
        if (player) {
        const args = message.content.slice(6).trim().split(' ');
        const song = args.join(' ');
        player.play(message.member.voice.channel, song);
        message.channel.send(`Mengputar lagu: ${song}`);
        } else {
        message.channel.send('Maaf, saya tidak dapat memainkan musik saat ini.');
        }
    } else if (message.content.startsWith('s!stop')) {
        if (player) {
        player.stop();
        message.channel.send('Musik dihentikan.');
        } else {
        message.channel.send('Maaf, saya tidak sedang memainkan musik.');
        }
    } else if (message.content.startsWith('s!skip')) {
        if (player) {
        player.skip();
        message.channel.send('Lagu di-skip.');
        } else {
        message.channel.send('Maaf, saya tidak sedang memainkan musik.');
        }
    };
}