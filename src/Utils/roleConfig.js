const fs = require('fs');
const path = require('path');

const roleConfigFile = path.join(__dirname, '../database/roleConfig.json');

// Load konfigurasi dari file
let roleConfig = {};
if (fs.existsSync(roleConfigFile)) {
    roleConfig = JSON.parse(fs.readFileSync(roleConfigFile, 'utf8'));
}

// Set role untuk level tertentu
function setRoleForLevel(guildId, level, roleId) {
    if (!roleConfig[guildId]) roleConfig[guildId] = {};
    roleConfig[guildId][level] = roleId;
    fs.writeFileSync(roleConfigFile, JSON.stringify(roleConfig, null, 2));
}

// Ambil role berdasarkan level
function getRoleForLevel(guildId, level) {
    return roleConfig[guildId] ? roleConfig[guildId][level] : null;
}

// Ambil semua role level untuk guild
function getAllLevelRoles(guildId) {
    return roleConfig[guildId] ? Object.values(roleConfig[guildId]) : [];
}

// Berikan role baru & hapus role sebelumnya
async function handleLevelUp(member, level) {
    const guildId = member.guild.id;
    const newRoleId = getRoleForLevel(guildId, level);
    if (!newRoleId) return;

    // Hapus semua role level sebelumnya
    const levelRoles = getAllLevelRoles(guildId);
    const rolesToRemove = member.roles.cache.filter(r => levelRoles.includes(r.id));
    if (rolesToRemove.size > 0) {
        await member.roles.remove(rolesToRemove).catch(console.error);
    }

    // Tambahkan role baru
    await member.roles.add(newRoleId).catch(console.error);
}

module.exports = { setRoleForLevel, getRoleForLevel, getAllLevelRoles, handleLevelUp };
