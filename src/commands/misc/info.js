const { 
    ApplicationCommandOptionType,
    ChannelType,
    PermissionFlagsBits, 
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require("discord.js");
const os = require('os');
require("dotenv").config();
const botname = process.env.BOT_NAME;

module.exports = {
    name: "info",
    description: "Information.",
    cyberlife: true,
    options: [
        {
            name: "ping",
            description: "Check bot ping!",
            type: ApplicationCommandOptionType.Subcommand
        },
        {
            name: "sistine",
            description: "Informasi tentang Sistine.",
            type: ApplicationCommandOptionType.Subcommand
        }
    ],
    botPermissions: PermissionFlagsBits.SendMessages,
    
    execute: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        
        if (subcommand === "ping") {
            await interaction.deferReply({ ephemeral: true });
            const reply = await interaction.fetchReply();
            const ping = reply.createdTimestamp - interaction.createdTimestamp;

            const mbud = new EmbedBuilder()
                .setTitle("Pong!")
                .setDescription(`Websocket: ${ping}ms\nClient API: ${client.ws.ping}ms`)
                .setColor("#06B5A4");
            interaction.editReply({ embeds: [mbud] });
        }
        
        if (subcommand === "sistine") {
            const imageUrls = [
                "https://cdn.discordapp.com/attachments/1360274106301419570/1360817152139071659/pixai-1867996143353512552-2.png?ex=67fc7f3b&is=67fb2dbb&hm=a74886f148244f227b8112de5905894c456bc63bea0f7b8481df2898f07ab387&",
                "https://cdn.discordapp.com/attachments/1360274106301419570/1360817152663486675/pixai-1867996143353512552-1.png?ex=67fc7f3b&is=67fb2dbb&hm=1dc12a90223f8f0281c06eedd142fe06422b30f5b78ff52d2e8e07ee3e4a432e&",
                "https://cdn.discordapp.com/attachments/1360274106301419570/1361323756269732242/pixai-1868502333859491329-1.png?ex=67fe570b&is=67fd058b&hm=a92f484f9714f280d87441b2301727e636766d49e51c94eba419faac91cbb0fe&",
                "https://cdn.discordapp.com/attachments/1360274106301419570/1361363043891806539/pixai-1868509082485079373-2.png?ex=67fe7ba2&is=67fd2a22&hm=8caecdfa574bac277211bcfed9aa865fe81ccb28991a64ecc821a7ee861adc61&"
            ];
            let currentPage = 0;
            const embed = new EmbedBuilder()
                .setAuthor({ name: client.user.username, iconURL: client.user.displayAvatarURL() })
                .setTitle(`Hai, your commander, ${client.user.username} here!`)
                .setColor("#06B5A4")
            .setImage(imageUrls[currentPage])
                .setDescription(`${client.user.username} adalah asisten virtual yang berprofesi sebagai Komandan Imperial Knight. Berperilaku tegas namun ramah, baik, sopan, dan hangat. ${client.user.username} sudah menikah dan memiliki suami seorang Jenderal Pasukan Khusus Penjaga Kaisar.`)
                .setFooter({ text: `Your commander, ${client.user.username}.` });
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('prev').setLabel('Model 1').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('next').setLabel('Model 2').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('nsfw').setLabel('NSFW Model').setStyle(ButtonStyle.Secondary),
                //new ButtonBuilder().setCustomId("seks").setLabel('S*x with Sakamura').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Tentang Developer").setURL("https://github.com/Sakamuraa")
);

const msg = await interaction.reply({ embeds: [embed], components: [row] });

const collector = msg.createMessageComponentCollector();

collector.on('collect', async interaction => {
  if (interaction.customId === 'next') {
    currentPage = 1;
  } else if (interaction.customId === 'prev') {
    currentPage = 0;
  } else if (interaction.customId === 'nsfw') {
    currentPage = 2;
  } /* else if (interaction.customId === 'seks') {
    currentPage = 3;
  } */

  // Update embed image
  embed.setImage(imageUrls[currentPage]);

  // Reset semua tombol ke enable dulu
  row.components[0].setDisabled(false); // prev
  row.components[1].setDisabled(false); // next
  row.components[2].setDisabled(false); // nsfw
  // components[3].setDisabled(false); // seks

  // Atur disable berdasarkan currentPage
  if (currentPage === 0) row.components[0].setDisabled(true); // disable prev di page 0
  if (currentPage === 1) row.components[1].setDisabled(true); // disable next di page 1
  if (currentPage === 2) row.components[2].setDisabled(true); // disable nsfw di page 2
  // (currentPage === 3) row.components[3].setDisabled(true); // disable seks di page 3

  await interaction.update({ embeds: [embed], components: [row] });
});
        }
        
    }
};
