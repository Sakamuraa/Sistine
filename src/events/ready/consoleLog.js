const { ActivityType } = require("discord.js");
const { checkAndSendUpdates } = require('../../lib/komikUpdate.js');
const { checkLatestAnime } = require('../../lib/animeUpdate.js');
const { checkAndSendInstagram } = require('../../lib/instagram/ig.js');

async function checkAnime(client) {
    checkLatestAnime(client);
    setInterval(checkLatestAnime, 10 * 60 * 1000);
}

async function checkKomik(client) {
    checkAndSendUpdates(client);
    setInterval(checkAndSendUpdates, 10 * 60 * 1000);
}

module.exports = async (client) => {
    console.log(`Connected to Discord as ${client.user.tag}!`);
    console.log('Total Guilds: ' + client.guilds.cache.size);
    //checkKomik(client);
    //checkAnime(client);
    
    const cyberlife = await client.guilds.cache.get("789097277141811230");
    const pasukan = cyberlife.members.cache.size;

    const updatePresence = async () => {
        checkAndSendUpdates(client);
        checkAndSendInstagram(client);
        //checkLatestAnime(client);
        
        // Set the presence with the custom activity
        client.user.setPresence({ 
            activities: [{ 
                name: `${pasukan} members | ${cyberlife.name}`,  // Set the name to the current channel name
                // state: `ONHEIL on TOP!`, // `Tracking ${statusArray.length} youtube channels`, 
                url: 'https://twitch.tv/luyorin',
                type: ActivityType.Listening
            }], 
            // status: 'online',
        });

        setTimeout(updatePresence, 600000);
    };

    updatePresence();
};
