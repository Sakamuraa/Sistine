const axios = require('axios');
const cheerio = require('cheerio');

async function searchDoujins(query) {
  const url = `https://nhentai.net/search/?q=${encodeURIComponent(query)}`;
  const res = await axios.get(url);
  const $ = cheerio.load(res.data);

  const results = [];

  $('.gallery').each((i, el) => {
    const title = $(el).find('.caption').text().trim();
    const link = 'https://nhentai.net' + $(el).find('a').attr('href');
    const cover = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

    const id = link.split('/')[4]; // ambil kode
    results.push({
      id,
      title,
      link,
      cover,
    });
  });

  return results;
}

async function getDoujinPages(doujinId) {
  const res = await axios.get(`https://nhentai.net/g/${doujinId}/`);
  const $ = cheerio.load(res.data);

  const pages = [];

  $('#thumbnail-container .thumb-container').each((i, el) => {
    let img = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');
    img = img.replace('t.jpg', '.jpg').replace('t.png', '.png').replace('t.webp.webp', '.webp').replace('t.webp', '.webp');
    img = img.replace('//t', '//i'); // hapus domain
    pages.push(img);
  });

  console.log('nHentai Lib:', pages)
  return pages; // hanya path: i.nhentai.net/galleries/xxxx/1.jpg
}

module.exports = { searchDoujins, getDoujinPages };