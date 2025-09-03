const { getDoujinPages } = require('../../lib/nhentaiLib.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (client, interaction) => {
  // if (!interaction.isStringSelectMenu()) return;
  if (interaction.customId === 'nhentai_select') {

  const selectedId = interaction.values[0];
  const doujin = client.nhentaiCache?.[interaction.user.id]?.[parseInt(selectedId)];

  const pages = await getDoujinPages(selectedId);
  if (!pages || pages.length === 0) {
    return interaction.update({ content: '❌ Gagal mengambil halaman doujin.', components: [] });
  }

  if (!client.nhentaiPagesCache) client.nhentaiPagesCache = {};
    
  const prevSession = client.nhentaiPagesCache[interaction.user.id];
  if (prevSession?.collector) prevSession.collector.stop();
  client.nhentaiPagesCache[interaction.user.id] = {
    doujinId: selectedId,
    current: 0,
    pages
  };

  const currentImage = pages[0];

  const embed = new EmbedBuilder()
    .setTitle(doujin?.title || 'Doujin')
    .setImage(currentImage)
    .setFooter({ text: `Halaman 1 / ${pages.length}` });

  const row = getRow(0, pages.length);

  await interaction.update({ content: '', embeds: [embed], components: [row] });

  const collector = interaction.channel.createMessageComponentCollector({
    filter: i => i.user.id === interaction.user.id,
    time: 180000,
  });
    
  client.nhentaiPagesCache[interaction.user.id].collector = collector

  collector.on('collect', async btn => {
    const data = client.nhentaiPagesCache[btn.user.id];
    if (!data) return;

    if (btn.customId === 'next' && data.current < data.pages.length - 1) data.current++;
    if (btn.customId === 'prev' && data.current > 0) data.current--;

    const embed = new EmbedBuilder()
      .setTitle(doujin?.title || 'Doujin')
      .setImage(data.pages[data.current])
      .setFooter({ text: `Halaman ${data.current + 1} / ${data.pages.length}` });

    const row = getRow(data.current, data.pages.length);

    await btn.update({ embeds: [embed], components: [row] });
  });

  collector.on('end', async () => {
    await interaction.editReply({ components: [] });
    delete client.nhentaiPagesCache[interaction.user.id];
  });
  }
    // return;
};

function getRow(current, max) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prev')
      .setLabel('⏮️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current === 0),

    new ButtonBuilder()
      .setCustomId('next')
      .setLabel('⏭️')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(current >= max - 1)
  );
}