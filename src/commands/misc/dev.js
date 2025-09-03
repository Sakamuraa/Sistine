const fs = require('fs');
const { 
    PermissionFlagsBits, 
    ApplicationCommandOptionType, 
    EmbedBuilder, 
    ChannelType, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle 
} = require('discord.js');
const config = require('../../../config.json');
const path = require("path");
const { readEmbedMessage, writeEmbedMessage } = require('../../handlers/embedHandler');
const guildReminders = JSON.parse(fs.readFileSync('./src/database/reminderGuilds.json'));
const filePath = path.join(__dirname, '../../database/reminderGuilds.json');
require("dotenv").config();
const botname = process.env.BOT_NAME;
const matiga = ["ON", "OFF"];
const owomatiga = ["Enable", "Disable"];

module.exports = {
    name: "admin",
    description: "Admin commandlist",
    cyberlife: true,
    options: [
        {
            name: "embed",
            description: "Embedded message.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "embed_id",
                    description: "Your Embed ID (terserah).",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
              {
                name: "channel",
                description: "channel to send embed",
                type: ApplicationCommandOptionType.Channel,
                //channelTypes: [ChannelType.GuildText],
                required: true,
              },
              {
                name: "title",
                description: "embed title",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "description",
                description: "input a description",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "color",
                description: "input color hex",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "thumbnail",
                description: "put an image link",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "mention",
                description: "role/user to mention",
                type: ApplicationCommandOptionType.Mentionable,
                required: false,
              },
              {
                name: "image-attach",
                description: "put an attachment",
                type: ApplicationCommandOptionType.Attachment,
                required: false,
              },
              {
                name: "image-link",
                description: "put an image link",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "video-attach",
                description: "put an attachment",
                type: ApplicationCommandOptionType.Attachment,
                required: false,
              },
              /* {
                name: "image",
                description: "put an image link",
                type: ApplicationCommandOptionType.String,
                required: false,
              }, */
              {
                name: "field-title",
                description: "Add a Field title",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "field-desc",
                description: "Add a Field description",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "footer",
                description: "input embed footer",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "footer-icon",
                description: "on/off",
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: matiga.map((ficon) => ({ name: ficon, value: ficon })),
              }
            ]
        },
        {
            name: "editembed",
            description: "Edit an embed.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "message_id",
                    description: "Message embed ID that want to edit.",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "title",
                    description: "New embed title.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    name: "description",
                    description: "New embed description.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    name: "color",
                    description: "New embed color (hex).",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: 'oworeminder',
            description: 'Set OwO Reminder enable/disable for current server.',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'status',
                    description: 'Set status to enable/disable.',
                    type: ApplicationCommandOptionType.String,
                    choices: owomatiga.map(pilih => ({ name: pilih, value: pilih.toLowerCase() }))
                }
            ]
        }
    ],
    botPermissions: PermissionFlagsBits.Administrator,
    permissionsRequired: PermissionFlagsBits.Administrator,

    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === "embed") {
            const messages = interaction.options.getString('description');
            const kolor = interaction.options.getString('color') || "#06B5A4";
            const channel = interaction.options.getChannel('channel');
            const title = interaction.options.getString('title') || null;
            const tamnel = interaction.options.getString('thumbnail') || null;
            const mention = interaction.options.getMentionable('mention');
            const images = interaction.options.getAttachment('image-attach') || 'files/none.png';
            /* const image = interaction.options.getString('image') || 'https://images-ext-1.discordapp.net/external/4lMPbpxT4Lj3wgrl4-7Lg-H0KfgPGl9ygkPlae-VX5M/https/photos.app.goo.gl/9kFkZUiQXnvLDhkD9'; */
            const fTitle = interaction.options.getString('field-title');
            const fDesc = interaction.options.getString('field-desc');
            const footers = interaction.options.getString('footer') || null;
            const fIcon = interaction.options.getString('footer-icon') || 'OFF';
            const images2 = interaction.options.getString('image-link') || null;
            const vid = interaction.options.getAttachment('video-attach');
            const embedId = interaction.options.getString('embed_id');
            
            function addEmbedMessage(messageId, videoId, discordChannelId, guildId) {
                const embedMessages = readEmbedMessage(); // Read current data from the JSON file

                // Check if the videoId already exists in the data
                if (!embedMessages[videoId]) {
                    // Initialize the structure for the new video
                    embedMessages[videoId] = {
                        messageId,
                        discordChannelId,
                        guildId
                    };
                }
                
                // Write the updated data back to the JSON file
                writeEmbedMessage(embedMessages);
            }

            const embud = new EmbedBuilder()
                .setTitle(title)
                .setThumbnail(tamnel)
                .setDescription(messages ? messages?.replace(/\\n/g, '\n') : null)
                .setColor(kolor)

            if (!images2) {
                embud.setImage(images.url)
            } else {
                embud.setImage(images2)
            }

            if (!fTitle) {
                if (fDesc) {
                    embud.addFields({ name: "\u200B", value: fDesc, inline: true })
                }
            } else {
                if (!fDesc) {
                    embud.addFields({ name: fTitle, value: "\u200B", inline: true })
                } else {
                    embud.addFields({ name: fTitle, value: fDesc, inline: true })
                }
            }

            /* if (fTitle && fDesc) {
                embud.addFields({ name: fTitle, value: fDesc })
            } */
            if (fIcon === 'ON') {
                embud.setFooter({ text: footers, iconURL: interaction.guild.iconURL() })
            }
            if (fIcon === 'OFF') {
                embud.setFooter({ text: footers, iconURL: null })
            }
            
            let sentMessage;

            if (!vid) { 
                if (!mention) {
                    sentMessage = await channel.send({ embeds: [embud] });
                } else {
                    sentMessage = await channel.send({ content: `${mention}`, embeds: [embud] });
                }
            } else {
                if (!mention) {
                    sentMessage = await channel.send({ embeds: [embud], files: [vid] });
                } else {
                    sentMessage = await channel.send({ content: `${mention}`, embeds: [embud], files: [vid] });
                }
            }
            await interaction.deferReply({ ephemeral: true });
            // Await function to wait for the message to be sent

            addEmbedMessage(sentMessage.id, embedId, channel.id, interaction.guild.id);
            interaction.editReply({ content: `Successfully sent ${embedId} => ${channel}` });
        }
        
        if (subcommand === "editembed") {
            await interaction.deferReply({ ephemeral: true });

            const messageId = interaction.options.getString('message_id');
            const newTitle = interaction.options.getString('title');
            const newDescription = interaction.options.getString('description');
            const newColor = interaction.options.getString('color');

            try {
                // Ambil pesan dari channel tempat command dikirim
                const message = await interaction.channel.messages.fetch(messageId);
                if (!message) return interaction.editReply({ content: 'Pesan tidak ditemukan.', ephemeral: true });

                // Pastikan pesan memiliki embed
                if (!message.embeds.length) return interaction.editReply({ content: 'Pesan ini tidak memiliki embed.', ephemeral: true });

                // Dapatkan embed lama
                const oldEmbed = message.embeds[0];

                // Buat embed baru berdasarkan embed lama
                const editedEmbed = new EmbedBuilder()
                    .setTitle(newTitle || oldEmbed.title)
                    .setDescription(newDescription || oldEmbed.description)
                    .setColor(newColor ? newColor.replace('#', '') : oldEmbed.color)
                    .setFooter(oldEmbed.footer ? { text: oldEmbed.footer.text } : null)
                    .setTimestamp(oldEmbed.timestamp ? new Date(oldEmbed.timestamp) : null);

                // Update pesan dengan embed baru
                await message.edit({ embeds: [editedEmbed] });

                return interaction.editReply({ content: 'Embed berhasil diperbarui!', ephemeral: true });

            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: 'Terjadi kesalahan saat mengedit embed.', ephemeral: true });
            }
        }
        
        if (subcommand === 'oworeminder') {
            const status = interaction.options.getString('status');
            const guildId = interaction.guild.id;
            
            guildReminders[guildId] = status === 'enable';
            fs.writeFileSync(filePath, JSON.stringify(guildReminders, null, 2));

            await interaction.reply({
              content: `<:check:1360542674456809622> | OwO Reminder telah di **${status}d** untuk server ini.`,
              ephemeral: true
            });
        }
    },
};
