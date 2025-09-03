const { testServer, cyberlifeId } = require("../../../config.json"); // sekarang array
const getApplicationCommands = require("../../Utils/getApplicationCommands");
const getLocalCommands = require("../../Utils/getLocalCommands");
const areCommandsDifferent = require("../../Utils/areCommandsDifferent");

const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

module.exports = async (client) => {
    const localCommands = getLocalCommands();

    try {
        console.log("🔁 Syncing local commands...");

        const globalCommands = await getApplicationCommands(client);
        const guildCommandsMap = {};
        const cyberlifeCommandsMap = {};

        // Preload all guild command caches
        for (const guildId of testServer) {
            guildCommandsMap[guildId] = await getApplicationCommands(client, guildId);
        }
        
        for (const guildId of cyberlifeId) {
            cyberlifeCommandsMap[guildId] = await getApplicationCommands(client, guildId);
        }

        for (const localCommand of localCommands) {
            const { name, description, options, testserver, cyberlife, deleted } = localCommand;

            if (testserver === true) {
                for (const guildId of testServer) {
                    const guildCommands = guildCommandsMap[guildId];
                    const commandExist = guildCommands.cache.find(cmd => cmd.name === name);

                    if (commandExist) {
                        if (deleted) {
                            await guildCommands.delete(commandExist.id);
                            console.log(`🗑️ Command "${name}" dihapus dari test server ${guildId}`);
                            continue;
                        }

                        if (areCommandsDifferent(commandExist, localCommand)) {
                            await guildCommands.edit(commandExist.id, { description, options });
                            console.log(`♻️ Command "${name}" diupdate di test server ${guildId}`);
                        }
                    } else {
                        if (deleted) {
                            console.log(`⏭️ Command "${name}" dilewatkan dari ${guildId} (ditandai deleted)`);
                            continue;
                        }

                        await client.application.commands.create({ name, description, options }, guildId);
                        console.log(`✅ Command "${name}" ditambahkan ke test server ${guildId}`);
                    }
                }

            } else if (cyberlife === true) {
                for (const guildId of cyberlifeId) {
                    const guildCommands = cyberlifeCommandsMap[guildId];
                    const commandExist = guildCommands.cache.find(cmd => cmd.name === name);

                    if (commandExist) {
                        if (deleted) {
                            await guildCommands.delete(commandExist.id);
                            console.log(`🗑️ Command "${name}" dihapus dari Cyberlife ${guildId}`);
                            continue;
                        }

                        if (areCommandsDifferent(commandExist, localCommand)) {
                            await guildCommands.edit(commandExist.id, { description, options });
                            console.log(`♻️ Command "${name}" diupdate di Cyberlife ${guildId}`);
                        }
                    } else {
                        if (deleted) {
                            console.log(`⏭️ Command "${name}" dilewatkan dari ${guildId} (ditandai deleted)`);
                            continue;
                        }

                        await client.application.commands.create({ name, description, options }, guildId);
                        console.log(`✅ Command "${name}" ditambahkan ke Cyberlife ${guildId}`);
                    }
                }

            } else {
                const commandExist = globalCommands.cache.find(cmd => cmd.name === name);

                if (commandExist) {
                    if (deleted) {
                        await globalCommands.delete(commandExist.id);
                        console.log(`🗑️ Command "${name}" dihapus dari global`);
                        continue;
                    }

                    if (areCommandsDifferent(commandExist, localCommand)) {
                        await globalCommands.edit(commandExist.id, { description, options });
                        console.log(`♻️ Command "${name}" diperbarui di global`);
                    }
                } else {
                    if (deleted) {
                        console.log(`⏭️ Command "${name}" dilewatkan (deleted)`);
                        continue;
                    }

                    await client.application.commands.create({ name, description, options });
                    console.log(`✅ Command "${name}" ditambahkan ke global`);
                }
            }
        }

    } catch (error) {
        console.log("❌ Error saat register command:", error);
    }
};
