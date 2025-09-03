const fs = require("fs");
const path = require("path");
const chalk = require('chalk');
const conf = require("../../../config.json");

module.exports = {
    name: "reload",
    description: "Reload semua command, event, dan main file",
    devOnly: true,
    cyberlife: true,
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });
        
        if (!conf.devs.includes(interaction.user.id)) {

            return interaction.editReply({ content: "Kamu tidak punya izin untuk menjalankan command ini.", ephemeral: true });

        }

        await interaction.editReply({ content: "Sedang me-reload...", ephemeral: true });

        try {

            // Reload commands

            client.commands.clear();

            const commandsPath = path.join(__dirname, '../../commands'); // Assuming this script is in src

            const commandFolders = fs.readdirSync(commandsPath);

            for (const folder of commandFolders) {
                const folderPath = path.join(commandsPath, folder);
                const commandFiles = fs.readdirSync(folderPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(folderPath, file);
                    delete require.cache[require.resolve(filePath)];
                    const command = require(filePath);

                    if ('name' in command && 'execute' in command) {
                        client.commands.set(command.name, command);
                    } else {
                        console.warn(`[WARNING] Command ${file} missing required "name" or "execute".`);
                    }
                }
            }

            // Reload events

            const eventsPath = path.join(__dirname, "../../events");

            const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith(".js"));

            for (const file of eventFiles) {

                const filePath = path.join(eventsPath, file);

                delete require.cache[require.resolve(filePath)];

                const event = require(filePath);

                if (event.once) {

                    client.once(event.name, (...args) => event.execute(...args, client));

                } else {

                    client.on(event.name, (...args) => event.execute(...args, client));

                }

            }

            // Optional: reload main file (index.js)

            const mainPath = path.join(__dirname, "../../../index.js");

            delete require.cache[require.resolve(mainPath)]; 

            await interaction.editReply({ content: "✅ Reload sukses!" });

        } catch (error) {

            console.error(error);

            await interaction.editReply({ content: "❌ Gagal reload. Cek console untuk detail." });

        }
    }
};
