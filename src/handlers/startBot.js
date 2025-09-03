require('dotenv').config();

function startBot(client) {
    client.login(process.env.BOT_TOKEN)
        .then(() => console.log('Bot has started successfully!'))
        .catch(err => console.error('Failed to start bot:', err));
}

module.exports = { startBot };