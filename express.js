const express = require('express'); // Untuk HTTP server
const path = require("path");
const fs = require("fs");
require('dotenv').config(); // Jika menggunakan file .env untuk menyimpan token

const app = express();

// Port untuk HTTP server
const PORT = 3001;

// Variabel status bot
let botStatus = {
  online: false,
  username: '',
  guildCount: 0,
};

function httpExpress(client) {
// Event saat bot siap (online)
client.once('ready', () => {
  // Update status bot
  botStatus.online = true;
  botStatus.username = client.user.username;
  botStatus.guildCount = client.guilds.cache.size;
});

// Event saat bot bergabung ke guild baru
client.on('guildCreate', (guild) => {
  botStatus.guildCount = client.guilds.cache.size;
});

// Event saat bot keluar dari guild
client.on('guildDelete', (guild) => {
  botStatus.guildCount = client.guilds.cache.size;
});

app.use(express.static(path.join(__dirname, "public")));

// Route untuk status bot
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));

  /* res.json({
    status: botStatus.online ? 'Online' : 'Offline',
    username: botStatus.username || 'N/A',
    guildCount: `${botStatus.guildCount} + 5 = ${botStatus.guildCount + 5}` || 0,
  }); */
});

app.get('/api/info', (req, res) => {
  res.json({
    name: botStatus.username,
    version: '1.0.0',
    developer: 'Sakamura',
    uptime: Math.floor(process.uptime()),
    servers: botStatus.guildCount,
    channels: client.channels.cache.size
  });
});

// Mulai HTTP server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP server running at http://localhost:${PORT}`);
});
}

module.exports = { httpExpress }