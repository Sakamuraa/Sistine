const path = require("path");
const getAllfiles = require("./getAllFiles");

module.exports = (exceptions = []) => {
    let localCommands = [];

    const commandCategories = getAllfiles(path.join(__dirname, "..", "commands"), true);

    for (const commandCategory of commandCategories) {
        const commandFiles = getAllfiles(commandCategory);

        for (const commandFile of commandFiles) {
            const command = require(commandFile);

            if (exceptions.includes(command.name)) continue;

            localCommands.push(command);
        }
    }

    return localCommands;
}