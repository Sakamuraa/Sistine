const { ApplicationCommandOptionType, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../database/userReminder.json');
let userPrefs = JSON.parse(fs.readFileSync(filePath));

module.exports = {
    name: 'reminder',
    description: 'OwO Reminder',
    cyberlife: true,
    options: [
        {
            name: 'set',
            description: 'Set OwO Reminder for specific type.',
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: 'mention',
            description: 'Set OwO Reminder mention to enable/disable.',
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    
    permissionsRequired: PermissionFlagsBits.Administrator,
    
    execute: async (client, interaction) => {
        const userId = interaction.user.id;

        const sub = interaction.options.getSubcommand();
        
        if (!interaction.guild) return interaction.reply('You\'re not submit a command in a server.');
        
        if (sub === 'mention') {
        // init default
        if (!userPrefs[userId]) {
          userPrefs[userId] = {
            hunt: true,
            pray: true,
            owo: true,
            mention: {
              hunt: true,
              pray: true,
              owo: true,
            },
          };
        } else if (!userPrefs[userId].mention) {
          userPrefs[userId].mention = {
            hunt: true,
            pray: true,
            owo: true,
          };
        }

        const embed = new EmbedBuilder()
          .setTitle("🔔 Pilih fitur untuk atur mention-nya:")
          .setDescription("Pilih salah satu: Hunt, Pray, atau OwO")
          .setColor("#cc345a");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("mention_hunt")
            .setLabel("Hunt")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("mention_pray")
            .setLabel("Pray")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("mention_owo")
            .setLabel("OwO")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });

        const collector = interaction.channel.createMessageComponentCollector({
          filter: (i) =>
            ["mention_hunt", "mention_pray", "mention_owo"].includes(i.customId) &&
            i.user.id === interaction.user.id,
          time: 60000,
          max: 1,
        });

        collector.on("collect", async (buttonInteraction) => {
          const type = buttonInteraction.customId.split("_")[1]; // hunt, pray, owo
          const currentStatus = userPrefs[userId].mention[type];

          const statusEmbed = new EmbedBuilder()
            .setTitle(`🔧 Pengaturan Mention untuk ${type.toUpperCase()}`)
            .setDescription(
              `Saat ini kamu akan ${currentStatus ? "**mendapat mention**" : "**tidak disebut**"} saat \`${type}\` reminder dikirim.`
            )
            .setColor(currentStatus ? "#cc345a" : "#141414");

          const toggleRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`mention_${type}_enable`)
              .setLabel("✅ Enable")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`mention_${type}_disable`)
              .setLabel("🚫 Disable")
              .setStyle(ButtonStyle.Danger)
          );

          await buttonInteraction.update({
            embeds: [statusEmbed],
            components: [toggleRow],
          });

          const toggleCollector =
            interaction.channel.createMessageComponentCollector({
              filter: (i) =>
                [`mention_${type}_enable`, `mention_${type}_disable`].includes(
                  i.customId
                ) && i.user.id === interaction.user.id,
              time: 60000,
              max: 1,
            });

          toggleCollector.on("collect", async (toggleInteraction) => {
            const newStatus = toggleInteraction.customId.endsWith("enable");
            userPrefs[userId].mention[type] = newStatus;
            fs.writeFileSync(filePath, JSON.stringify(userPrefs, null, 2));

            await toggleInteraction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`🔧 Mention ${type.toUpperCase()} diupdate!`)
                  .setDescription(
                    `Kamu sekarang akan ${
                      newStatus ? "**mendapat mention**" : "**tidak disebut**"
                    } untuk reminder \`${type}\`.`
                  )
                  .setColor(newStatus ? "#cc345a" : "#141414"),
              ],
              components: [],
            });
          });
        });
            }
        
        if (sub === 'set') {
        // init default
        if (!userPrefs[userId]) {
          userPrefs[userId] = {
            hunt: true,
            pray: true,
            owo: true,
            mention: {
              hunt: true,
              pray: true,
              owo: true,
            },
          };
        }

        const embed = new EmbedBuilder()
          .setTitle("🔔 Pilih fitur untuk atur tipe-nya:")
          .setDescription("Pilih salah satu: Hunt/Battle, Pray/Curse, atau OwO")
          .setColor("#cc345a");

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("type_hunt")
            .setLabel("Hunt/Battle")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("type_pray")
            .setLabel("Pray/Curse")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("type_owo")
            .setLabel("OwO")
            .setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({
          embeds: [embed],
          components: [row],
          ephemeral: true,
        });

        const collector = interaction.channel.createMessageComponentCollector({
          filter: (i) =>
            ["type_hunt", "type_pray", "type_owo"].includes(i.customId) &&
            i.user.id === interaction.user.id,
          time: 60000,
          max: 1,
        });

        collector.on("collect", async (buttonInteraction) => {
          const type = buttonInteraction.customId.split("_")[1]; // hunt, pray, owo
          const currentStatus = userPrefs[userId]?.[type];

          const statusEmbed = new EmbedBuilder()
            .setTitle(`🔧 Pengaturan Reminder`)
            .setDescription(
              `Saat ini kamu akan ${currentStatus ? "**mendapat reminder**" : "**tidak mendapat reminder**"} untuk tipe \`${type}\`.`
            )
            .setColor(currentStatus ? "#cc345a" : "#141414");

          const toggleRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`type_${type}_enable`)
              .setLabel("✅ Enable")
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId(`type_${type}_disable`)
              .setLabel("🚫 Disable")
              .setStyle(ButtonStyle.Danger)
          );

          await buttonInteraction.update({
            embeds: [statusEmbed],
            components: [toggleRow],
          });

          const toggleCollector =
            interaction.channel.createMessageComponentCollector({
              filter: (i) =>
                [`type_${type}_enable`, `type_${type}_disable`].includes(
                  i.customId
                ) && i.user.id === interaction.user.id,
              time: 60000,
              max: 1,
            });

          toggleCollector.on("collect", async (toggleInteraction) => {
            const newStatus = toggleInteraction.customId.endsWith("enable");
            if (!userPrefs[userId]) userPrefs[userId] = {};
            userPrefs[userId][type] = newStatus;
            fs.writeFileSync(filePath, JSON.stringify(userPrefs, null, 2));

            await toggleInteraction.update({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`🔧 Reminder di update!`)
                  .setDescription(
                    `Kamu sekarang akan ${
                      newStatus ? "**mendapat reminder**" : "**tidak mendapat reminder**"
                    } untuk reminder \`${type}\`.`
                  )
                  .setColor(newStatus ? "#cc345a" : "#141414"),
              ],
              components: [],
            });
          });
        });
            }
    }
}