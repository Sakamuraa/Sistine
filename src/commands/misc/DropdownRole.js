const { PermissionFlagsBits, ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const { DR } = require('../../database/mongoose');

module.exports = {
    name: "dropdown",
    description: "Setup select menu role.",
    cyberlife: true,
    options: [
        {
            name: "add",
            description: "Setup a select menu role.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "title",
                    description: "Title untuk select menu embed.",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "description",
                    description: "Description untuk select menu embed.",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "role_1",
                    description: "Role pertama.",
                    type: ApplicationCommandOptionType.Role,
                    required: true
                },
                {
                    name: "attachment",
                    description: "Insert an attachment.",
                    type: ApplicationCommandOptionType.Attachment,
                    required: false
                },
                {
                    name: "role_2",
                    description: "Role kedua.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_3",
                    description: "Role ketiga.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_4",
                    description: "Role keempat.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_5",
                    description: "Role kelima.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_6",
                    description: "Role keenam.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_7",
                    description: "Role ketujuh.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_8",
                    description: "Role kedelapan.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_9",
                    description: "Role kesembilan.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                },
                {
                    name: "role_10",
                    description: "Role kesepuluh.",
                    type: ApplicationCommandOptionType.Role,
                    required: false
                }
                // Tambah sampai 25 role jika perlu
            ]
        },
        {
            name: "addrole",
            description: "Add a role to select menu role.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'message_id',
                    description: 'Message ID dari menu yang ingin ditambahkan.',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'role',
                    description: 'Role yang mau ditambahkan ke select menu.',
                    type: ApplicationCommandOptionType.Role,
                    required: true
                },
                {
                    name: 'description',
                    description: 'Edit embed description yang sudah ada.',
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "remove",
            description: "Remove a select menu role.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'message_id',
                    description: 'Message ID dari menu yang ingin dihapus.',
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: "removerole",
            description: "Remove a role from select menu role.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: 'message_id',
                    description: 'Message ID dari menu yang ingin dihapus.',
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: 'role',
                    description: 'Role yang mau dihapus dari select menu.',
                    type: ApplicationCommandOptionType.Role,
                    required: true
                },
                {
                    name: 'description',
                    description: 'Edit embed description yang sudah ada.',
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
          	name: "editembed",
          	description: "Edit embed dari select menu role",
          	type: ApplicationCommandOptionType.Subcommand,
          	options: [
          	  	{
              	  	name: "message_id",
              	  	description: "Message ID dari select menu yang ingin diubah",
              		type: ApplicationCommandOptionType.String,
              		required: true
            	},
                {
                    name: "title",
                    description: "Judul baru untuk embed",
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    name: "description",
                    description: "Deskripsi baru untuk embed",
                    type: ApplicationCommandOptionType.String,
                    required: false
                },
                {
                    name: "attachment",
                    description: "Insert an attachment.",
                    type: ApplicationCommandOptionType.Attachment,
                    required: false
                },
                {
                    name: "color",
                    description: "Warna hex untuk embed (misal: #77b4e9)",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "list",
            description: "Lihat semua select menu role aktif di server ini",
          	type: ApplicationCommandOptionType.Subcommand
        }
    ],

    botPermissions: PermissionFlagsBits.ManageRoles,
    permissionsRequired: PermissionFlagsBits.ManageRoles,

    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');

        // === ADD COMMAND ===
        if (subcommand === "add") {
            await interaction.deferReply({ ephemeral: true });
            
            const attachment = interaction.options.getAttachment('attachment');

            // Ambil role dari opsi
            const roles = [];
            for (let i = 1; i <= 25; i++) {
                const role = interaction.options.getRole(`role_${i}`);
                if (role) roles.push(role);
            }

            if (roles.length === 0) {
                return interaction.editReply({ content: "Kamu harus memilih setidaknya satu role!" });
            }

            // Buat menu opsi
            const options = roles.map(role =>
                new StringSelectMenuOptionBuilder()
                    .setLabel(role.name)
                    .setValue(role.id)
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId("select-role")
                .setPlaceholder("Pilih role kamu")
                .setMinValues(0)
                .setMaxValues(options.length)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description ? description.replace(/\\n/g, '\n') : 'Pilih role dibawah yang ingin kamu dapatkan.')
                .setColor("#06B5A4");
            
            let files = [];

            if (attachment) {
                const filename = attachment.name.toLowerCase();

                if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".png") || filename.endsWith(".gif")) {
                    embed.setImage(attachment.url);
                } else if (filename.endsWith(".mp4") || filename.endsWith(".mov") || filename.endsWith(".webm")) {
                    files.push(attachment.url);
                } else {
                    return interaction.editReply({
                        content: "❌ File format not supported. Use image (jpg, png, gif) or video (mp4, mov, webm).",
                        ephemeral: true
                    });
                }
            };

            const msg = await interaction.channel.send({
                embeds: [embed],
                components: [row],
                files
            });

            // Simpan ke MongoDB
            await DR.create({
                guildId: interaction.guild.id,
                channelId: interaction.channel.id,
                messageId: msg.id,
                reactions: roles.map(role => ({
                    roleId: role.id,
                    label: role.name
                }))
            });

            await interaction.editReply({ content: `✅ Select menu berhasil dikirim dan dikonfigurasi.`, ephemeral: true });
        }
        
        if (subcommand === "addrole") {
            await interaction.deferReply({ ephemeral: true });

            const messageId = interaction.options.getString("message_id");
            const newRole = interaction.options.getRole("role");
            const newDesc = interaction.options.getString("description");

            const config = await DR.findOne({ guildId: interaction.guild.id, messageId });
            if (!config) {
                return interaction.editReply({ content: "❌ Konfigurasi tidak ditemukan di database." });
            }

            // Cek apakah role sudah ada
            const alreadyExists = config.reactions.find(r => r.roleId === newRole.id);
            if (alreadyExists) {
                return interaction.editReply({ content: "⚠️ Role ini sudah ada di menu." });
            }

            // Tambahkan ke data DB
            config.reactions.push({ roleId: newRole.id, label: newRole.name });
            await config.save();

            // Ambil pesan aslinya
            const channel = await interaction.guild.channels.cache.get(config.channelId);
            if (!channel) return interaction.editReply({ content: "❌ Channel tidak ditemukan." });

            const message = await interaction.channel.messages.fetch(config.messageId); //.catch(() => null);
            if (!message) return interaction.editReply({ content: "❌ Pesan tidak ditemukan." });

            // Buat ulang opsi menu
            const options = config.reactions.map(r => ({
                label: r.label,
                value: r.roleId
            }));

            const menu = new StringSelectMenuBuilder()
                .setCustomId("select-role")
                .setPlaceholder("Pilih role kamu")
                .setMinValues(0)
                .setMaxValues(options.length)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(menu);

            // Edit embed (jika ada)
            const embed = message.embeds[0];

            if (newDesc) {
                embed.setDescription(newDesc.replace(/\\n/g, '\n'));
            }

            await message.edit({
                embeds: [embed],
                components: [row]
            });

            await interaction.editReply({ content: `✅ Role <@&${newRole.id}> berhasil ditambahkan ke select menu.` });
        }


        // === REMOVE COMMAND ===
        if (subcommand === "remove") {
            await interaction.deferReply({ ephemeral: true });

            const messageId = interaction.options.getString("message_id");

            const config = await DR.findOneAndDelete({
                guildId: interaction.guild.id,
                messageId
            });

            if (!config) {
                return interaction.editReply({ content: "Konfigurasi tidak ditemukan." });
            }

            try {
                const channel = interaction.guild.channels.cache.get(config.channelId);
                const message = await channel.messages.fetch(messageId);

                await message.edit({
                    content: "**❌ Select menu telah dihapus oleh admin.**",
                    components: []
                });

                await interaction.editReply({ content: "✅ Select menu berhasil dihapus!" });
            } catch (err) {
                console.error(err);
                await interaction.editReply({ content: "⚠️ Gagal menghapus pesan dari channel." });
            }
        }
        
        if (subcommand === "removerole") {
            await interaction.deferReply({ ephemeral: true });

            const messageId = interaction.options.getString("message_id");
            const role = interaction.options.getRole("role");
            const newDesc = interaction.options.getString("description");

            const config = await DR.findOne({ guildId: interaction.guild.id, messageId });

            if (!config) {
                return interaction.editReply({ content: "❌ Konfigurasi select menu tidak ditemukan." });
            }

            // Cek apakah role ada di config
            const exists = config.reactions.find(r => r.roleId === role.id);
            if (!exists) {
                return interaction.editReply({ content: "⚠️ Role tersebut tidak ada di menu." });
            }

            // Hapus dari DB
            config.reactions = config.reactions.filter(r => r.roleId !== role.id);
            await config.save();

            const channel = interaction.guild.channels.cache.get(config.channelId);
            if (!channel) return interaction.editReply({ content: "❌ Channel tidak ditemukan." });

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return interaction.editReply({ content: "❌ Pesan tidak ditemukan." });

            // Buat ulang opsi select menu
            const options = config.reactions.map(r => ({
                label: r.label,
                value: r.roleId
            }));

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("select-role")
                    .setPlaceholder("Pilih role kamu")
                    .setMinValues(0)
                    .setMaxValues(options.length)
                    .addOptions(options)
            );
            
            // Edit embed (jika ada)
            const embed = await message.embeds[0];

            if (newDesc) {
                embed.setDescription(newDesc.replace(/\\n/g, '\n'));
            }

            await message.edit({
                components: [row]
            });

            await interaction.editReply({ content: `✅ Role <@&${role.id}> berhasil dihapus dari menu.` });
        }
        
        if (subcommand === "editembed") {
            await interaction.deferReply({ ephemeral: true });

            const messageId = interaction.options.getString("message_id");
            const newTitle = interaction.options.getString("title");
            const newDesc = interaction.options.getString("description");
            const newAttachment = interaction.options.getAttachment("attachment");
            const newColor = interaction.options.getString("color");

            const config = await DR.findOne({ guildId: interaction.guild.id, messageId });

            if (!config) {
                return interaction.editReply({ content: "❌ Konfigurasi tidak ditemukan." });
            }

            const channel = interaction.guild.channels.cache.get(config.channelId);
            if (!channel) return interaction.editReply({ content: "❌ Channel tidak ditemukan." });

            const message = await channel.messages.fetch(messageId).catch(() => null);
            if (!message) return interaction.editReply({ content: "❌ Pesan tidak ditemukan." });

            const oldEmbed = message.embeds[0];
            if (!oldEmbed) return interaction.editReply({ content: "❌ Embed tidak ditemukan di pesan." });

            const updatedEmbed = EmbedBuilder.from(oldEmbed);

            if (newTitle) updatedEmbed.setTitle(newTitle);
            if (newDesc) updatedEmbed.setDescription(newDesc);
            if (newColor) updatedEmbed.setColor(newColor);
            let files = [];

            if (newAttachment) {
                const filename = newAttachment.name.toLowerCase();

                if (filename.endsWith(".jpg") || filename.endsWith(".jpeg") || filename.endsWith(".png") || filename.endsWith(".gif")) {
                    updatedEmbed.setImage(newAttachment.url);
                } else if (filename.endsWith(".mp4") || filename.endsWith(".mov") || filename.endsWith(".webm")) {
                    files.push(newAttachment.url);
                } else {
                    return interaction.editReply({
                        content: "❌ Format file tidak didukung. Gunakan gambar (jpg, png, gif) atau video (mp4, mov, webm).",
                        ephemeral: true
                    });
                }
            };

            await message.edit({
                embeds: [updatedEmbed],
                components: message.components,
                files
            });

            await interaction.editReply({ content: "✅ Embed berhasil diperbarui!" });
        }

        
        if (subcommand === "list") {
            await interaction.deferReply({ ephemeral: true });

            const menus = await DR.find({ guildId: interaction.guild.id });
            if (!menus || menus.length === 0) {
                return interaction.editReply({ content: "❌ Tidak ada select menu role yang dikonfigurasi di server ini." });
            }

            let page = 0;
            const perPage = 1;
            const totalPages = Math.ceil(menus.length / perPage);

            const generateEmbed = (pageIndex) => {
                const data = menus[pageIndex];

                const embed = new EmbedBuilder()
                    .setTitle(`📋 Select Menu #${pageIndex + 1} of ${totalPages}`)
                    .addFields(
                        { name: "📨 Message ID", value: `\`${data.messageId}\``, inline: true },
                        { name: "📺 Channel", value: `<#${data.channelId}>`, inline: true },
                        { name: "🎭 Roles", value: data.reactions.map(r => `- <@&${r.roleId}>`).join("\n") || "Tidak ada role" }
                    )
                    .setColor("#cc345a")
                    .setFooter({ text: "Gunakan tombol di bawah untuk berpindah halaman." });

                return embed;
            };
            
            const buttons = [
                new ButtonBuilder()
                    .setCustomId("prev_page")
                    .setLabel("⬅️ Prev")
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId("next_page")
                    .setLabel("Next ➡️")
                    .setStyle(ButtonStyle.Primary),
                 new ButtonBuilder()
                    .setCustomId("delete_menu")
                    .setLabel("🗑️ Delete")
                    .setStyle(ButtonStyle.Danger)
            ];

            const reply = await interaction.editReply({
                embeds: [generateEmbed(page)],
                components: [new ActionRowBuilder().addComponents(buttons)],
                fetchReply: true
            });

            const collector = reply.createMessageComponentCollector({
                filter: i => i.user.id === interaction.user.id,
                time: 60_000
            });

            collector.on("collect", async (i) => {
                if (i.customId === "prev_page") page--;
                if (i.customId === "next_page") page++;
                
                const isFirst = page === 0;
            	const isLast = page === totalPages - 1;
                
                const getButtons = (isFirst, isLast, includeDelete = true) => {
                    const buttonss = [
                        new ButtonBuilder()
                            .setCustomId("prev_page")
                            .setLabel("⬅️ Prev")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(isFirst),
                        new ButtonBuilder()
                            .setCustomId("next_page")
                            .setLabel("Next ➡️")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(isLast)
                    ];

                    if (includeDelete) {
                        buttonss.push(
                            new ButtonBuilder()
                                .setCustomId("delete_menu")
                                .setLabel("🗑️ Delete")
                                .setStyle(ButtonStyle.Danger)
                        );
                    }

                    return new ActionRowBuilder().addComponents(buttonss);
                };

                
                await i.update({
                    embeds: [generateEmbed(page)],
                    components: [getButtons(isFirst, isLast)]
                });
                
                if (i.customId === "delete_menu") {
                    const target = menus[page];

                    try {
                        const ch = interaction.guild.channels.cache.get(target.channelId);
                        const msg = await ch.messages.fetch(target.messageId).catch(() => null);
                        if (msg) await msg.edit({ content: "**❌ Menu ini telah dihapus oleh admin.**", components: [] });

                        await DR.deleteOne({ guildId: target.guildId, messageId: target.messageId });

                        menus.splice(page, 1);
                        page = Math.max(0, page - 1);
                        totalPages = Math.max(1, Math.ceil(menus.length / perPage));

                        await i.update({
                            content: menus.length === 0 ? "✅ Semua menu telah dihapus!" : undefined,
                            embeds: menus.length === 0 ? [] : [await generateEmbed(page)],
                            components: menus.length === 0 ? [] : [getButtons(page === 0, page === totalPages - 1)]
                        });
                    } catch (err) {
                        console.error(err);
                        await i.reply({ content: "❌ Gagal menghapus menu ini.", ephemeral: true });
                    }

                    return;
                }

            });

            collector.on("end", async () => {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("prev_page").setLabel("⬅️ Prev").setStyle(ButtonStyle.Secondary).setDisabled(true),
                    new ButtonBuilder().setCustomId("next_page").setLabel("Next ➡️").setStyle(ButtonStyle.Secondary).setDisabled(true)
                );

                await interaction.editReply({
                    components: [disabledRow]
                });
            });
        }


    }
};
