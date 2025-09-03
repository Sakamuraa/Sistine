const { ApplicationCommandOptionType, ButtonBuilder, ButtonStyle, PermissionFlagsBits, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
    name: 'komik',
    description: 'Bantu cari komik buat kamu.',
    cyberlife: true,
    options: [
        {
            name: 'title',
            description: 'Masukin judul komik yang kamu cari.',
            type: ApplicationCommandOptionType.String,
            required: true
        }
    ],
    
    botPermissions: PermissionFlagsBits.EmbedLinks,
    
    execute: async (client, interaction) => {
        const keyword = interaction.options.getString('title');
        await interaction.deferReply();
        
        if (!interaction.guild) return interaction.reply('You\'re not submit a command in a server.');

        const url = `https://komikindo.ch/?s=${encodeURIComponent(keyword)}`;
        const res = await axios.get(url);
        const $ = cheerio.load(res.data);

        const results = [];

        $('.animepost .animposx').each((i, el) => {
          const title = $(el).find('a').attr('title');
          const link = $(el).find('a').attr('href');
          const image = $(el).find('img').attr('src');
          if (title && link && image) {
            results.push({ title, link, image });
          }
        });

        if (results.length === 0) {
          return interaction.editReply('❌ Tidak ditemukan komik dengan judul tersebut.');
        }

        const options = results.slice(0, 25).map((res, index) => (
          new StringSelectMenuOptionBuilder()
            .setLabel(res.title.length > 100 ? res.title.slice(0, 97).split("Komik")[1] + '...' : res.title.split('Komik')[1])
            .setValue(index.toString())
        ));

        const select = new StringSelectMenuBuilder()
          .setCustomId('select_komik')
          .setPlaceholder('Pilih salah satu komik')
          .addOptions(options);

        const row = new ActionRowBuilder().addComponents(select);

        await interaction.editReply({
          embeds: [new EmbedBuilder().setDescription(`🔍 Ditemukan ${results.length} hasil untuk **${keyword}**.`).setColor('#06B5A4')],
          components: [row]
        });

        const collector = interaction.channel.createMessageComponentCollector({
          filter: i => i.customId === 'select_komik' && i.user.id === interaction.user.id,
          time: 30_000
        });

        collector.on('collect', async i => {
          const selectedIndex = parseInt(i.values[0]);
          const selected = results[selectedIndex];

          const detailRes = await axios.get(selected.link);
          const $$ = cheerio.load(detailRes.data);

          const sinopsisRaw = $$('.entry-content[itemprop="description"] p').text();
          const sinopsis = sinopsisRaw.replace(/\s+/g, ' ').trim() || '*Sinopsis tidak tersedia.*';
          const shortSinopsis = sinopsis.length > 1000 ? sinopsis.slice(0, 1000).split("bercerita tentang ")[1] + "..." : sinopsis.split("bercerita tentang ")[1];
          const latestChapter = $$('.epsbaru .barunew').last().text().trim() || 'Tidak tersedia';
          const chapterMatch = latestChapter.match(/Chapter\s*(\d+)/i);
          const chapterValue = chapterMatch ? chapterMatch[1] : latestChapter;

          // Fungsi ambil data teks biasa
          const getInfo = (label) => {
            const span = $$('.spe span').filter((i, el) => {
              return $$(el).find('b').text().toLowerCase().includes(label.toLowerCase());
            }).first();
            return span.text().replace(/.*?:/, '').trim() || '-';
          };

          // Fungsi ambil isi tag <a> (tema & jenis komik)
          const getLinkText = (label) => {
            const span = $$('.spe span').filter((i, el) => {
              return $$(el).find('b').text().toLowerCase().includes(label.toLowerCase());
            }).first();
            return span.find('a').text().trim() || '-';
          };
            
          const getFieldArray = (label) => {
            const span = $$('.spe span').filter((i, el) => {
              return $$(el).find('b').text().toLowerCase().includes(label.toLowerCase());
            }).first();

            const links = span.find('a');
            const values = [];

            links.each((i, el) => {
              const text = $$(el).text().trim();
              if (text) values.push(text);
            });

            return values.length > 1 ? values.join(', ') : values[0] || '-';
          };


          const altTitle = getInfo('Judul Alternatif');
          const status = getInfo('Status');
          const statusEn = status.toLowerCase() === 'tamat' ? "Finished" : "Ongoing";
          const author = getInfo('Pengarang');
          const hdImage = await selected.image.replace(/-\d+x\d+/, '');
          const theme = getFieldArray('Tema');
          const grafis = getFieldArray('Grafis');
          const type = getLinkText('Jenis Komik');
            
          const shortDesc = sinopsis.length > 1000 ? sinopsis.slice(0, 1000) + '...' : sinopsis;
          let selectAuthor = '';
          if (type === 'Manga') {
              selectAuthor = `Baca Manga ${selected.title.split("Komik ")[1]}`
          } else if (type === 'Manhwa') {
              selectAuthor = `Baca Manhwa ${selected.title.split("Komik ")[1]}`
          } else if (type === 'Manhua') {
              selectAuthor = `Baca Manhua ${selected.title.split("Komik ")[1]}`
          } else {
              selectAuthor = `Baca Komik ${selected.title.split("Komik ")[1]}`
          };

          const embed = new EmbedBuilder()
          	  .setAuthor({ name: `${selected.title.split("Komik ")[1]} | ${type}` })
              .setTitle(selectAuthor)
              .setURL(selected.link)
              .setDescription(`${shortSinopsis}`)
              .addFields(
                { name: 'Alt Title', value: altTitle || 'Unavailable', inline: false },
                { name: 'Chapter', value: chapterValue, inline: true },
                { name: 'Author', value: author || 'Unknown', inline: true },
                { name: 'Status', value: statusEn || 'Unknown', inline: true }
              )
              .setImage(hdImage)
              .setFooter({ text: 'Source: Komikindo' })
              .setColor('#06B5A4'); // Warna gelap netral, bisa ganti sesuai selera
          if (theme && theme !== '-') {
            embed.addFields({ name: 'Genre', value: theme || 'Tidak tersedia', inline: true })
          }
          if (grafis && grafis !== '-') {
            embed.addFields({ name: 'Graphic', value: grafis, inline: true });
          }
            
          const baen = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Baca Disini").setURL(selected.link)
          );

          await i.update({
            content: '',
            embeds: [embed],
            components: [baen]
          });
        });

    }
}