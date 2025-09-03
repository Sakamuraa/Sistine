const {
    ActionRowBuilder,
    SlashCommandBuilder,
    ButtonBuilder, ButtonStyle, ChannelSelectMenuBuilder, ChannelType, ComponentType,
    PermissionFlagsBits,
    ApplicationCommandOptionType,
    EmbedBuilder
} = require("discord.js");
const { LogConfig } = require('../../database/mongoose');
const path = require("path");
const fs = require("fs");

function getModlogPath(guildId) {
    const dir = path.join(__dirname, "../../database/modlogs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    return path.join(dir, `${guildId}.json`);
}

function loadModLogs(guildId) {
    const filePath = getModlogPath(guildId);
    if (!fs.existsSync(filePath)) return [];
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveModLogs(guildId, logs) {
    const filePath = getModlogPath(guildId);
    fs.writeFileSync(filePath, JSON.stringify(logs, null, 4));
}

function parseDuration(input) {
    const regex = /(\d+)\s*([dhm])/gi;
    let match;
    let totalMs = 0;

    while ((match = regex.exec(input)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();

        switch (unit) {
            case 'd': totalMs += value * 24 * 60 * 60 * 1000; break;
            case 'h': totalMs += value * 60 * 60 * 1000; break;
            case 'm': totalMs += value * 60 * 1000; break;
        }
    }
    return totalMs;
}

function formatDurationText(input) {
    const regex = /(\d+)\s*([dhm])/gi;
    let result = [];

    while ((match = regex.exec(input)) !== null) {
        const value = parseInt(match[1]);
        const unit = match[2];

        let unitText = "";

        switch (unit) {
            case "d":
                unitText = value === 1 ? "day" : "days";
                break;
                
            case "h":
                unitText = value === 1 ? "hour" : "hours";
                break;

            case "m":
                unitText = value === 1 ? "minute" : "minutes";
                break;
        }
        result.push(`${value} ${unitText}`);
    }

    return result.join(" ");
}


module.exports = {
    name: "mod",
    description: "Moderation action.",
    options: [
        {
            name: "warn",
            description: "Warning a user.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "target",
                    description: "The user to warn.",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "reason",
                    description: "The reason for the warning.",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: "mute",
            description: "Mute a user.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "target",
                    description: "The user to mute.",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "duration",
                    description: "Mute duration (ex. 2h30m).",
                    type: ApplicationCommandOptionType.String,
                    required: true
                },
                {
                    name: "reason",
                    description: "Reason for muting.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "unmute",
            description: "Unmute a user.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "target",
                    description: "User who want to unmute.",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "reason",
                    description: "Reason why the user unmuted.",
                    type: ApplicationCommandOptionType.String,
                    required: false
                }
            ]
        },
        {
            name: "kick",
            description: "Kick a user.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "target",
                    description: "The user to kick.",
                    type: ApplicationCommandOptionType.User,
                    required: true
                },
                {
                    name: "reason",
                    description: "Reason for kicking.",
                    type: ApplicationCommandOptionType.String,
                    required: true
                }
            ]
        },
        {
            name: "modlogs",
            description: "Check user moderation logs.",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                {
                    name: "target",
                    description: "user who want to see their modlogs",
                    type: ApplicationCommandOptionType.User,
                    required: true
                }
            ]
        },
        {
            name: 'logchannel',
            description: 'Set a logchannel enabled or disabled.',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    botPermissions: PermissionFlagsBits.KickMembers,
    permissionsRequired: PermissionFlagsBits.KickMembers,
    
    execute: async (client, interaction) => {
        const sub = interaction.options.getSubcommand();
        const target = interaction.options.getUser("target");
        const reason = interaction.options.getString("reason") || "No reason.";
        const logs = loadModLogs(interaction.guild.id);
        const moderator = interaction.user.id;
        const unix = Math.floor(Date.now() / 1000);
        const guildId = interaction.guild.id;
        //const logChannel = client.channels.cache.get("1358053618837622986");
        const config = await LogConfig.findOne({ guildId: interaction.guild.id });
        
        if (!interaction.guild) return interaction.reply('You\'re not submit a command in a server.');
        
        if (sub === "warn") {
            interaction.deferReply({ ephemeral: true });
            
            const userLogs = logs.filter(log => log.userId === target.id);
            const caseId = logs.length + 1;
            const userCase = userLogs.length + 1;
           
            logs.push({
                case: caseId,
                userId: target.id,
                type: "warn",
                reason,
                moderator: moderator,
                date: unix,
                guildId,
                userCase
            });

            saveModLogs(guildId, logs);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Case ${caseId} | Warn | ${target.username}`, iconURL: target.displayAvatarURL() })
                .addFields(
                    { name: "User", value: `<@${target.id}>` },
                    { name: "Reason", value: reason }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp()
                .setColor("#f2e446");
            
            const userEmbed = new EmbedBuilder()
                .setAuthor({ name: `Case ${userCase} | Warn | ${target.username}`, iconURL: target.displayAvatarURL() })
                .setDescription(`Hey <@${target.id}>, you've been __warned__ in **${interaction.guild.name}** for the following reasons: \n\`\`\`${reason}\`\`\``)
                .setColor("#f2e446")
                .setTimestamp();

            await target.send({ embeds: [userEmbed] });
            if (config) {
                const logChannel = await interaction.guild.channels.cache.get(config.channelId);
                await logChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
            };
            await interaction.editReply({ content: `<@${target.id}> has been warned for the following reasons: \n\`\`\`${reason}\`\`\``, ephemeral: true });
        }
        
        if (sub === "mute") {
            interaction.deferReply({ ephemeral: true });
            
            const userLogs = logs.filter(log => log.userId === target.id);
            const caseId = logs.length + 1;
            const userCase = userLogs.length + 1;
            
            const duration = interaction.options.getString("duration");
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        	if (!member) return interaction.editReply({ content: "⚠️ | User not found.", ephemeral: true });
            
            const durationMs = parseDuration(duration);
            if (durationMs < 2 * 60 * 1000) {
                return interaction.editReply({ content: "⚠️ | Durasi minimal mute adalah 2 menit.", ephemeral: true });
            }
            
            const dur = formatDurationText(duration);

            if (!member.moderatable) return interaction.editReply({ content: "⚠️ | I cannot mute this user.", ephemeral: true });
            await member.timeout(durationMs, reason);

            logs.push({
                case: caseId,
                userId: target.id,
                type: "mute",
                reason,
                duration: dur,
                moderator,
                date: unix,
                guildId,
                userCase
            });

            saveModLogs(guildId, logs);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Case ${caseId} | Mute | ${target.username}`, iconURL: target.displayAvatarURL() })
                .addFields(
                    { name: "User", value: `<@${target.id}>` },
                    { name: "Length", value: `${dur}` },
                    { name: "Reason", value: reason }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp()
                .setColor("#f0801f");

            const userEmbed = new EmbedBuilder()
                .setAuthor({ name: `Case ${userCase} | Mute | ${target.username}`, iconURL: target.displayAvatarURL() })
                .setDescription(`Hey <@${target.id}>, You have been __muted__ in **${interaction.guild.name}** for **${dur}** for the following reasons: \n\`\`\`${reason}\`\`\``)
                .setColor("#f0801f")
                .setTimestamp();
            
            if (config) {
                const logChannel = await interaction.guild.channels.cache.get(config.channelId);
                await logChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
            };
            await target.send({ embeds: [userEmbed] });
            await interaction.editReply({ content: `<@${target.id}> has been muted for **${dur}** for the following reasons: \n\`\`\`${reason}\`\`\``, ephemeral: true });
        };
        
        if (sub === "unmute") {
            interaction.deferReply({ ephemeral: true });
            
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        	if (!member) return interaction.editReply({ content: "⚠️ | User not found.", ephemeral: true });
            if (!member.isCommunicationDisabled()) return interaction.editReply({ content: "⚠️ | This user is not on mute.", ephemeral: true });
            
            await member.timeout(null, reason);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Case xXx | Unmute | ${target.username}`, iconURL: target.displayAvatarURL() })
                .addFields(
                    { name: "User", value: `<@${target.id}>` },
                    { name: "Reason", value: reason }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp()
                .setColor("#f0801f");
            
            if (config) {
                const logChannel = await interaction.guild.channels.cache.get(config.channelId);
                await logChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
            };
            await interaction.editReply({ content: `<@${target.id}> has been unmuted for the following reasons: \n\`\`\`${reason}\`\`\``, ephemeral: true });
        };
        
        if (sub === "kick") {
            interaction.deferReply({ ephemeral: true });
            
            const userLogs = logs.filter(log => log.userId === target.id);
            const caseId = logs.length + 1;
            const userCase = userLogs.length + 1;
            
            const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        	if (!member) return interaction.editReply({ content: "⚠️ | User not found.", ephemeral: true });
            if (!member.kickable) return interaction.editReply({ content: "⚠️ | I cannot kick this user.", ephemeral: true });
            
            await member.kick(reason);

            logs.push({
                case: caseId,
                userId: target.id,
                type: "kick",
                reason,
                moderator,
                date: unix,
                guildId,
                userCase
            });

            saveModLogs(guildId, logs);

            const embed = new EmbedBuilder()
                .setAuthor({ name: `Case ${caseId} | Kick | ${target.username}` })
                .addFields(
                    { name: "User", value: `<@${target.id}>` },
                    { name: "Reason", value: reason }
                )
                .setFooter({ text: `ID: ${target.id}` })
                .setTimestamp()
                .setColor("#f0451f");

            const userEmbed = new EmbedBuilder()
                .setAuthor({ name: `Case ${userCase} | Kick | ${target.username}`, iconURL: target.displayAvatarURL() })
                .setDescription(`Hey <@${target.id}>, you've been __kicked__ from **${interaction.guild.name}** for the reason: \n\`\`\`${reason}\`\`\``)
                .setColor("#f0451f")
                .setTimestamp();
            
            if (config) {
                const logChannel = await interaction.guild.channels.cache.get(config.channelId);
                await logChannel.send({ content: `<@${target.id}>`, embeds: [embed] });
            };
            await target.send({ embeds: [userEmbed] });
            await interaction.editReply({ content: `${target.displayName} has been kicked for the following reasons: \n\`\`\`${reason}\`\`\``, ephemeral: true });
        }
        
        if (sub === "modlogs") {
            //interaction.deferReply({ ephemeral: true });
            
            const log = loadModLogs(interaction.guild.id);
            const logs = log.filter(logg => logg.userId === target.id);

        	const embed = new EmbedBuilder()
            	.setAuthor({ name: `Modlogs for ${target.username}`, iconURL: target.displayAvatarURL() })
                .setColor("#77b4e9")
                if (logs.length === 0) {
                    embed.setDescription("No moderation logs found for this user.");
                } else {
                    for (const log of logs) {
                        let mod;
                        try {
                            const user = await client.users.fetch(log.moderator);
                            mod = `${user.username} | <@${user.id}>`;
                        } catch {
                            mod = `Unknown ${log.moderator}`; // fallback kalau gagal fetch (misal user leave)
                        }

                        let value = `- **Moderator**: ${mod}`;

                        if (log.type === "mute" && log.duration) {
                            value += `\n- **Duration**: ${log.duration}`;
                        }

                        value += `\n- **Date**: <t:${log.date}:f>\n- **Reason**: ${log.reason}`;

                        embed.addFields({
                            name: `Case #${log.userCase} | ${log.type.toUpperCase()}`,
                            value,
                            inline: false
                        });
                    }

                }

        	await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        if (sub === 'logchannel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("log_enable")
                    .setLabel("Enable")
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId("log_disable")
                    .setLabel("Disable")
                    .setStyle(ButtonStyle.Danger)
            );

            await interaction.reply({
                content: "🛠️ Please choose enable or disable the log channel:",
                components: [row],
                ephemeral: true
            });

            const collector = interaction.channel.createMessageComponentCollector({
                componentType: ComponentType.Button,
                filter: i => i.user.id === interaction.user.id,
                time: 60_000
            });

            collector.on("collect", async i => {
                if (i.customId === "log_disable") {
                    const logChannel = LogConfig.findOneAndDelete({ guildId: interaction.guild.id });
                    if (logChannel) {
                        await i.update({ content: "✅ Log channel has been disabled.", components: [] });
                    } else {
                        await i.update({ content: "❌Cancelled.", components: [] });
                    }
                }

                if (i.customId === "log_enable") {
                    const menu = new ChannelSelectMenuBuilder()
                        .setCustomId("select_log_channel")
                        .setPlaceholder("Select channel for modlog")
                        .addChannelTypes(ChannelType.GuildText);

                    const selectRow = new ActionRowBuilder().addComponents(menu);

                    await i.update({
                        content: "📌 Select channel for sending modlog:",
                        components: [selectRow]
                    });

                    const selectCollector = i.channel.createMessageComponentCollector({
                        componentType: ComponentType.ChannelSelect,
                        filter: s => s.user.id === interaction.user.id,
                        time: 60_000
                    });

                    selectCollector.on("collect", async s => {
                        const selected = s.values[0];
                        await LogConfig.findOneAndUpdate(
                            { guildId: interaction.guild.id },
                            { channelId: selected },
                            { upsert: true }
                        );

                        await s.update({
                            content: `✅ Log channel set to <#${selected}>`,
                            components: []
                        });
                    });
                }
            });
        }
        
    }
}