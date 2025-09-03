const fs = require('fs');
const path = require('path');

const levelsFile = path.join(__dirname, '../database/levels.json');

// Load data level
let levels = {};
if (fs.existsSync(levelsFile)) {
    levels = JSON.parse(fs.readFileSync(levelsFile, 'utf8'));
}

// Fungsi untuk menambah XP dan level
function addXP(guildId, userId, xpAmount) {
    if (!levels[guildId]) levels[guildId] = {};
    if (!levels[guildId][userId]) {
        levels[guildId][userId] = { xp: 0, level: 1 };
    }

    levels[guildId][userId].xp += xpAmount;

    // Cek apakah user naik level
    let xpNeeded = levels[guildId][userId].level * 125;
    if (levels[guildId][userId].xp >= xpNeeded) {
        levels[guildId][userId].xp -= xpNeeded;
        levels[guildId][userId].level += 1;
        return true; // Return true kalau naik level
    }
    return false;
}

// Fungsi untuk mendapatkan level user
function getLevel(guildId, userId) {
    if (!levels[guildId] || !levels[guildId][userId]) {
        return { xp: 0, level: 1 };
    }
    return levels[guildId][userId];
}

// Simpan data ke file JSON
function saveLevels() {
    fs.writeFileSync(levelsFile, JSON.stringify(levels, null, 2));
}

function getLeaderboard(guildId) {
    if (!levels[guildId]) return [];

    const sortedUsers = Object.entries(levels[guildId])
        .map(([userId, data]) => ({
            userId,
            level: data.level,
            xp: data.xp
        }))
        .sort((a, b) => b.level - a.level || b.xp - a.xp) // Urutkan berdasarkan level, lalu XP
        .slice(0, 10); // Ambil 10 user teratas

    return sortedUsers;
}

module.exports = { addXP, getLevel, saveLevels, getLeaderboard };
