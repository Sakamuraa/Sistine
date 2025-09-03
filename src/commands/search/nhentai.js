// command/nhentai.js
const { ApplicationCommandOptionType, SlashCommandBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { searchDoujins } = require('../../lib/nhentaiLib.js');

module.exports = {
  name: 'nhentai',
  description: 'Cari doujin berdasarkan judul atau kode',
  cyberlife: true,
  options: [ 
    	{
    		name: 'query',
        	description: 'Masukkan judul atau kode doujin',
            type: ApplicationCommandOptionType.String,
        	required: true
		}
	],
  execute: async (client, interaction) => {
    const query = interaction.options.getString('query');
    await interaction.deferReply();

    // Fetch pencarian dari nhentai (pakai API publik atau scraping html)
    const results = await searchDoujins(query); // custom function
    if (!results.length) return interaction.editReply('Tidak ada hasil ditemukan.');

    const select = new StringSelectMenuBuilder()
      .setCustomId('nhentai_select')
      .setPlaceholder('Pilih doujin')
      .addOptions(results.slice(0, 25).map((r, i) => ({
        label: r.title.length > 100 ? r.title.slice(0, 97) + '...' : r.title,
        value: r.id,
      })));


    const row = new ActionRowBuilder().addComponents(select);

    await interaction.editReply({ content: 'Pilih doujin yang ingin dibaca:', components: [row] });

    // simpan hasil search agar bisa digunakan kembali
    client.nhentaiCache = client.nhentaiCache || {};
    client.nhentaiCache[interaction.user.id] = results;
  }
};
