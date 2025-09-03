const { EmbedBuilder } = require("discord.js");

module.exports = async (message, client) => {
    const prefix = ",";

    // Potong command jadi array
    const args = message.content.slice(prefix.length).trim().split(/ +/);

    if (message.content.startsWith(`${prefix}ml`)) {
        // args[0] = "ml", args[1] = "-2", args[2..n] = lane info
        if (args.length < 2) return message.reply("Format salah. Contoh: `,ml -2 xp gold` atau `,ml -2`");
            
        const minRaw = args[1];
        const jumlah = parseInt(minRaw.replace("-", ""));
        if (isNaN(jumlah)) return message.reply("Jumlah anggota tidak valid. Gunakan format seperti `-2`");
    
        let lane = "Any Lane";
        const laneArgs = args.length >= 3 ? args.slice(2) : lane;
        if (args.length >= 3) {
            lane = laneArgs
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }
    
        // Embed awal (tersedia)
        let isFull = false;
    
        const generateEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("New Room! | Mobile Legends")
                .setColor(isFull ? "Red" : "Green")
                .addFields(
                    {
                        name: "Anggota Dibutuhkan",
                        value: isFull ? "***Sudah Penuh***" : `**${jumlah} Orang**`,
                        inline: false
                    },
                    {
                        name: "Lane Dibutuhkan",
                        value: `**${laneArgs !== lane ? lane.join(", ") : lane}**`,
                        inline: false
                    }
                )
                .setTimestamp();
            return embed;
        };
    
        const sent = await message.channel.send({
            content: `<@&1319626065110634566> **Info lebih lanjut, silahkan mention ${message.author}**`,
            embeds: [generateEmbed()]
        });
    
        await sent.react("🇫");
    
        const filter = (reaction, user) =>
            reaction.emoji.name === "🇫" && user.id === message.author.id;
    
        const collector = sent.createReactionCollector({ filter, time: 10 * 60 * 1000 });
    
        collector.on('collect', async () => {
            isFull = !isFull; // toggle status
            try {
                await sent.edit({
                    embeds: [generateEmbed()]
                });
            } catch (err) {
                console.error("Gagal edit embed toggle:", err);
            }
        });
        
        await message.delete();
    
        // Auto delete setelah 30 menit
        setTimeout(() => {
            if (!sent.deleted) {
                sent.delete().catch(() => {});
            }
        }, 10 * 60 * 1000);
    }
    
    if (message.content.startsWith(`${prefix}hok`)) {
        if (args.length < 2) return message.reply("Format salah. Contoh: `,hok -2 clash farm` atau `,hok -2`");

        const minRaw = args[1];
        const jumlah = parseInt(minRaw.replace("-", ""));
        if (isNaN(jumlah)) return message.reply("Jumlah anggota tidak valid. Gunakan format seperti `-2`");
    
        let lane = "Any Lane";
        const laneArgs = args.length >= 3 ? args.slice(2) : lane;
        if (args.length >= 3) {
            lane = laneArgs
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        }
    
        // Embed awal (tersedia)
        let isFull = false;
    
        const generateEmbed = () => {
            const embed = new EmbedBuilder()
                .setTitle("New Room! | Honor of Kings")
                .setColor(isFull ? "Red" : "Green")
                .addFields(
                    {
                        name: "Anggota Dibutuhkan",
                        value: isFull ? "***Sudah Penuh***" : `**${jumlah} Orang**`,
                        inline: false
                    },
                    {
                        name: "Lane Dibutuhkan",
                        value: `**${laneArgs !== lane ? lane.join(", ") : lane}**`,
                        inline: false
                    }
                )
                .setTimestamp();
            return embed;
        };
    
        const sent = await message.channel.send({
            content: `<@&1321668433372385300> **Info lebih lanjut, silahkan mention ${message.author}**`,
            embeds: [generateEmbed()]
        });
    
        await sent.react("🇫");
    
        const filter = (reaction, user) =>
            reaction.emoji.name === "🇫" && user.id === message.author.id;
    
        const collector = sent.createReactionCollector({ filter, time: 10 * 60 * 1000 });
    
        collector.on('collect', async () => {
            isFull = !isFull; // toggle status
            try {
                await sent.edit({
                    embeds: [generateEmbed()]
                });
            } catch (err) {
                console.error("Gagal edit embed toggle:", err);
            }
        });
        
        await message.delete();
    
        // Auto delete setelah 30 menit
        setTimeout(() => {
            if (!sent.deleted) {
                sent.delete().catch(() => {});
            }
        }, 10 * 60 * 1000);
    }
}
