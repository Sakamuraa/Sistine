const { LavaShark } = require("lavashark");
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
  client.lavashark = new LavaShark({
      // userID: "1360488334732038258",
      nodes: [
        {
          id: "Sistine Lavalink",
          hostname: 'lava-v3.ajieblogs.eu.org',
          port: 80,
          password: "https://dsc.gg/ajidevserver",
          secure: false,
        },
      ],
      sendWS: (guildId, payload) => {
        const guild = client.guilds.cache.get(guildId);
        if (guild) guild.shard.send(payload);
      },
  });

  // Untuk nyambungin lavalink sama voice state Discord
  client.on('raw', (packet) => client.lavashark.handleVoiceUpdate(packet));

  client.on("ready", async () => {
      client.lavashark.start(client.user.id);
      
      // Event ketika node berhasil connect
      client.lavashark.on("nodeConnect", (node) => {
        console.log(`✅ [Lavalink] Node ${node.identifier} connected!`);
      });

      // Event ketika node disconnect
      client.lavashark.on("nodeDisconnect", (node, reason) => {
        console.warn(`⚠️ [Lavalink] Node ${node.identifier} disconnected. Reason: ${reason}`);
      });

      // Event track mulai dimainkan
      client.lavashark.on("trackStart", (player, track) => {
        const embed = new EmbedBuilder()
          .setDescription(`Started playing **[${track.title}](${track.uri})**`)
          .setColor("#06B5A4");

        const channel = client.channels.cache.get(player.textChannelId);
        if (channel) channel.send({ embeds: [embed] }).catch(console.error);
      });

      // Event antrian habis
      client.lavashark.on("queueEnd", (player) => {
        const channel = client.channels.cache.get(player.textChannelId);
        if (channel) channel.send("✅ Antrian habis, saya akan keluar...");
        player.disconnect();
      });
    });
};
