// shard.js
const { ShardingManager } = require('discord.js');
const path = require('path');
require("dotenv").config();

const manager = new ShardingManager(path.join(__dirname, 'index.js'), {
    totalShards: 'auto', // bisa juga di-set manual
    token: process.env.BOT_TOKEN || '', // ganti sesuai tokenmu
});

manager.on('shardCreate', shard => {
    console.log(`[Shard Manager] Shard #${shard.id} sedang nyala...`);
});

manager.spawn(); // Menjalankan semua shard
