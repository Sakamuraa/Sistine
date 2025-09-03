const axios = require('axios');
const cheerio = require('cheerio');
const ytdl = require('ytdl-core');
const puppeteer = require('puppeteer');
const path = require("path");
const fs = require("fs");
const yahooFinance = require('yahoo-finance2').default;

const { exec, spawn } = require("child_process");
const { Readable } = require('stream');
const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
require("dotenv").config();

const aiChannels = ["1360274106301419570", "1360274332571537628", "1396795849375355040"];
const { askAI } = require('../../Utils/askAI');
const komikCommand = require('../../msgCommands/komik.js');

const processedMessages = new Set();

// Fungsi ambil harga real-time
async function getRealTimePrice(pair) {
    const yahooSymbol = pair.toUpperCase() === 'XAUUSD' ? 'GC=F' : `GC=F`;

    try {
        const quote = await yahooFinance.quoteSummary(yahooSymbol, { modules: ['price'] });
        console.log("Quote Price: ", quote.price);
        if (quote && quote.price.regularMarketPrice !== undefined) {
            return {
                current: quote.price.regularMarketPrice,
                changePercent: `${(quote.price.regularMarketChangePercent || 0).toFixed(2)}%`,
                high: quote.price.regularMarketDayHigh || 'N/A',
                low: quote.price.regularMarketDayLow || 'N/A',
                volume: quote.price.regularMarketVolume || 'N/A',
                source: 'Yahoo Finance'
            };
        }
    } catch (err) {
        console.warn(`⚠️ Yahoo gagal: ${err.message}`);
    }
    
    return null;
}

module.exports = async (message, client) => {
    if (message.author.bot) return;
    if (!message.guild) return;
    
    if (processedMessages.has(message.id)) {
        console.log(`[AI DEBUG] Pesan ${message.id} sudah diproses.`);
        return;
    };
    
    processedMessages.add(message.id);
    setTimeout(() => processedMessages.delete(message.id), 30000);

    const userPrompt = message.content.trim();
    const userId = message.author.id;
    
    const isInAiChannel = aiChannels.includes(message.channel.id);
    const isMentioned = message.mentions.has(client.user);
    
    if (isInAiChannel || isMentioned) {

    const prompt = isMentioned ? userPrompt.replace(`<@${client.user.id}>`, '') : userPrompt;

    // 1. AI Analisis Pesan
    const aiResponse = await askAI(message, userId, `
        Analisa pesan berikut:
        "${prompt}"
    
        Ekstrak perintah, nama atau warna dari input user, lalu buat JSON valid sesuai perintah:
        - Buat role: {"action": "createRole", "name": "<NAMA_ROLE>", "color": "<WARNA_HEX atau default>"}
        - Hapus role dari server: {"action": "deleteRole", "name": "<NAMA_ROLE>"}
        - Kick user: {"action": "kickUser", "user": "<username/mention>"}
        - Ban user: {"action": "banUser", "user": "<username/mention>"}
        - Buat channel: {"action": "createChannel", "name": "<NAMA_CHANNEL>", "type": "text|voice"}
        - Hapus channel: {"action": "deleteChannel", "name": "<NAMA_CHANNEL>"}
        - Ubah nickname: {"action": "setNickname", "user": "<username/mention>", "nickname": "<NICKNAME_BARU>"}
        - Slowmode channel: {"action": "setSlowmode", "seconds": <DETIK>}
        - Kunci channel: {"action": "lockChannel", "channel": "<NAMA_CHANNEL>"}
        - Buka kunci channel: {"action": "unlockChannel", "channel": "<NAMA_CHANNEL>"}
        - Tambahkan role ke user: {"action": "giveRole", "user": "<username/mention>", "role": "<ROLE>"}
        - Hapus role dari user: {"action": "removeRole", "user": "<username/mention>", "role": "<ROLE>"}
        - Buat voting: {"action": "createVote", "question": "<PERTANYAAN>", "options": ["<OPSI1>", "<OPSI2>", "<OPSI3>"], "time": <DETIK>}
        - Buat quiz dengan jawaban benar: {"action": "createQuizWithAnswer", "question": "<PERTANYAAN>", "options": ["<OPS1>", "<OPS2>"], "answer": "<JAWABAN_BENAR>", "time": <DETIK>}
        - Buat quiz random: {"action": "createRandomQuiz"}
        - Ringkas artikel: {"action": "summarize", "url": "<URL>"}
        - Info YouTube: {"action": "youtubeInfo", "url": "<YOUTUBE_URL>"}
        - Download YouTube audio: {"action": "youtubeDownloadAudio", "url": "<YOUTUBE_URL>"}
        - Download YouTube video: {"action": "youtubeDownloadVideo", "url": "<YOUTUBE_URL>"}
        - Jelaskan kode: {"action": "explainCode", "code": "<POTONGAN_KODE>"}
        - Konversi mata uang: {"action": "currencyConvert", "from": "<MATA_UANG_ASAL>", "to": "<MATA_UANG_TUJUAN>", "amount": <NILAI>}
        - Download TikTok: {"action": "tiktokDownload", "url": "<TIKTOK_URL>"}
        - Download Instagram: {"action": "instagramDownload", "url": "<INSTAGRAM_URL>"}
        - Translate: {"action": "translateText", "text": "<TEXT>", "to": "<TARGET_LANGUAGE>"} 
        - Meme Generator: {"action": "meme", "text": "<TEKS_ATAS | TEKS_BAWAH>"} 
        - Text-to-Speech: {"action": "tts", "text": "<TEKS>"} 
        - Info signal: {"action": "infoSignal", "symbol": "XAUUSD"}
        Dan jika tidak ada aksi jelas, hanya balas dengan: {"action": "chat"}.
    
        Catatan:
        - Pastikan "name" selalu sama persis dengan nama yang disebut user.
        - Pastikan warna HEX diambil dari input (contoh: #FF0000).
        - Pastikan balasan harus berupa JSON, jangan jawaban langsung.
        - Pastikan balasan langsung JSON, tanpa adanya "Pesan yang saya terima" atau "Maka saya akan menjawab".
        - Pastikan balasan tanpa ada awalan seperti \`\`\`json atau '''json atau apapun itu.
    `);
    
    console.log("Response: ", aiResponse);

    let parsed;
    try {
        parsed = JSON.parse(aiResponse);
    } catch {
        // Fallback ke mode chat
        const chatReply = await askAI(message, userId, prompt);
        return message.reply(chatReply);
    }
    
    

    // 2. Aksi dengan Permission Check
    const member = message.member;

    const needsAdminActions = ['createRole', 'deleteRole', 'kickUser', 'banUser', 'createChannel', 'deleteChannel', 'giveRole', 'removeRole', 'lockChannel', 'unlockChannel', 'setNickname', 'setSlowmode'];
    const isAdmin = member.permissions.has('Administrator') || member.permissions.has('ManageGuild');

    if (needsAdminActions.includes(parsed.action) && !isAdmin) {
        return message.reply('❌ Kamu tidak punya izin untuk melakukan aksi ini (Admin/Manage Server required).');
    }
    
    function findRole(input, guild) {
        const roleCache = guild.roles.cache;
    
        // Jika input dalam format mention <@&ID>
        const mentionMatch = input.match(/^<@&(\d+)>$/);
        if (mentionMatch) {
            return roleCache.get(mentionMatch[1]);
        }
    
        // Jika input angka (RoleID)
        if (/^\d+$/.test(input)) {
            return roleCache.get(input);
        }
    
        // Cari berdasarkan nama (case-insensitive)
        return roleCache.find(r => r.name.toLowerCase() === input.toLowerCase());
    }
    
    function formatDuration(seconds) {
        const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const s = Math.floor(seconds % 60).toString().padStart(2, '0');
        return h === '00' ? `${m}:${s}` : `${h}:${m}:${s}`;
    }

    try {
        console.log("Action: ", parsed.action);
        switch (parsed.action) {
            case 'createRole':
                await message.channel.sendTyping();
                
                const role = await message.guild.roles.create({
                    name: parsed.name,
                    color: parsed.color || '#FFFFFF',
                    reason: `Role dibuat oleh AI dari ${message.author}`
                });
                return message.reply(`✅ Role **${role.name}** berhasil dibuat.`);

            case 'deleteRole':
                await message.channel.sendTyping();
                
                // Pakai fungsi ini
                const roleToDelete = findRole(parsed.name, message.guild);
                if (!roleToDelete) return message.reply(`⚠️ Role **${parsed.name}** tidak ditemukan.`);
                await roleToDelete.delete();
                return message.reply(`🗑️ Role **${parsed.name}** dihapus.`);

            case 'kickUser':
                await message.channel.sendTyping();
            
                const memberKick = message.mentions.members.first() ||
                    message.guild.members.cache.find(m => m.user.username === parsed.user);
                if (!memberKick) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
                await memberKick.kick('Dikeluarkan oleh AI');
                return message.reply(`👢 User **${memberKick.user}** di-kick.`);

            case 'banUser':
                await message.channel.sendTyping();
                
                const memberBan = message.mentions.members.first() ||
                    message.guild.members.cache.find(m => m.user.username === parsed.user);
                if (!memberBan) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
                await memberBan.ban({ reason: 'Dibanned oleh AI' });
                return message.reply(`🔨 User **${memberBan.user}** di-ban.`);

            case 'createChannel':
                await message.channel.sendTyping();
            
                const newChannel = await message.guild.channels.create({
                    name: parsed.name,
                    type: parsed.type === 'voice' ? 2 : 0,
                    reason: `Channel dibuat oleh AI`
                });
                return message.reply(`📢 Channel **${newChannel.name}** berhasil dibuat.`);

            case 'deleteChannel':
                await message.channel.sendTyping();
                
                const channelToDelete = message.guild.channels.cache.find(c => c.name === parsed.name);
                if (!channelToDelete) return message.reply(`⚠️ Channel **${parsed.name}** tidak ditemukan.`);
                await channelToDelete.delete(`Channel dihapus oleh AI`);
                return message.reply(`🗑️ Channel **${parsed.name}** telah dihapus.`);

            case 'setNickname':
                await message.channel.sendTyping();
                
                const nickMentions = message.mentions.members;
            
                // const memberNick = message.mentions.members.first() || message.guild.members.cache.find(m => m.user.username === parsed.user);
                                   
                let memberNick;
                if (nickMentions.size > 0) {
                    const mentionArrayNick = Array.from(nickMentions.values());
                    if (mentionArrayNick[0].id === client.user.id && mentionArrayNick.length > 1) {
                        memberNick = mentionArrayNick[1];
                    } else {
                        memberNick = mentionArrayNick[0];
                    }
                }
                
                if (!memberNick) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
                await memberNick.setNickname(parsed.nickname);
                return message.reply(`✏️ Nickname **${memberNick.user}** diubah menjadi **${parsed.nickname || "default"}**.`);
            
            case 'setSlowmode':
                await message.channel.sendTyping();
                
                const seconds = parseInt(parsed.seconds) || 0;
                await message.channel.setRateLimitPerUser(seconds);
                return message.reply(`🐢 Slowmode di channel ini diatur ke **${seconds} detik**.`);
            
            case 'lockChannel':
                await message.channel.sendTyping();
                
                const lockCh = message.guild.channels.cache.find(c => c.name === parsed.channel) || message.channel;
                await lockCh.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: false });
                return message.reply(`🔒 Channel **${lockCh.name}** sudah dikunci.`);
            
            case 'unlockChannel':
                await message.channel.sendTyping();
                
                const unlockCh = message.guild.channels.cache.find(c => c.name === parsed.channel) || message.channel;
                await unlockCh.permissionOverwrites.edit(message.guild.roles.everyone, { SendMessages: true });
                return message.reply(`🔓 Channel **${unlockCh.name}** sudah dibuka.`);
            
            /* case 'giveRole':
                const memberRoleAdd = message.mentions.members.first() ||
                                      message.guild.members.cache.find(m => `<@${m.user.id}>` === parsed.user);
                if (!memberRoleAdd) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
                const roleAdd = message.guild.roles.cache.find(r => r.name.toLowerCase() === parsed.role);
                if (!roleAdd) return message.reply(`⚠️ Role **${parsed.role}** tidak ditemukan.`);
                await memberRoleAdd.roles.add(roleAdd);
                return message.reply(`✅ Role **${parsed.role}** diberikan ke **${memberRoleAdd.user}**.`);
            */
            
            case 'giveRole':
                await message.channel.sendTyping();
                
                // Ambil semua mention
                const mentions = message.mentions.members;
            
                // Jika mention pertama adalah bot, ambil mention kedua
                let memberRoleAdd;
                if (mentions.size > 0) {
                    const mentionArray = Array.from(mentions.values());
                    if (mentionArray[0].id === client.user.id && mentionArray.length > 1) {
                        memberRoleAdd = mentionArray[1];
                    } else {
                        memberRoleAdd = mentionArray[0];
                    }
                }
            
                // Kalau tidak ada mention, coba cari user manual
                if (!memberRoleAdd) {
                    memberRoleAdd = message.guild.members.cache.find(m => `<@${m.user.id}>` === parsed.user);
                }
            
                if (!memberRoleAdd) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
            
                const roleAdd = findRole(parsed.role, message.guild);
                if (!roleAdd) return message.reply(`⚠️ Role **${parsed.role}** tidak ditemukan.`);
            
                await memberRoleAdd.roles.add(roleAdd);
                return message.reply(`✅ Role **${parsed.role}** diberikan ke **${memberRoleAdd.user}**.`);
                
            case 'removeRole':
                await message.channel.sendTyping();
                
                const memberRoleRemove = message.mentions.members.first() ||
                                         message.guild.members.cache.find(m => m.user.username === parsed.user);
                if (!memberRoleRemove) return message.reply(`⚠️ User **${parsed.user}** tidak ditemukan.`);
                const roleRemove = findRole(parsed.role, message.guild);
                if (!roleRemove) return message.reply(`⚠️ Role **${parsed.role}** tidak ditemukan.`);
                await memberRoleRemove.roles.remove(roleRemove);
                return message.reply(`❌ Role **${parsed.role}** dihapus dari **${memberRoleRemove.user}**.`);
                
            case 'createVote':
                await message.channel.sendTyping();
                
                if (!parsed.question || !parsed.options || parsed.options.length === 0) {
                    return message.reply("⚠️ Voting tidak valid. Pastikan ada pernyataan dan opsi.");
                }
            
                const { question, options, time } = parsed;
                const quizTime = (time && Number(time)) || 30;
            
                // Generate emoji angka untuk setiap opsi
                const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                const optionList = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');
            
                const quizMessage = await message.channel.send({
                    embeds: [{
                        title: `📢 Voting: ${question}`,
                        description: `${optionList}\n\n⏱ Waktu: ${quizTime} detik\nReact dengan emoji untuk vote!`,
                        color: 0x00AE86
                    }]
                });
            
                // Tambahkan reaksi untuk tiap opsi
                for (let i = 0; i < options.length; i++) {
                    await quizMessage.react(emojis[i]);
                }
            
                // Collect responses
                const filter = (reaction, user) => emojis.includes(reaction.emoji.name) && !user.bot;
                const collector = quizMessage.createReactionCollector({ filter, time: quizTime * 1000 });
            
                const votes = {};
            
                collector.on('collect', (reaction, user) => {
                    if (!votes[user.id]) votes[user.id] = reaction.emoji.name;
                });
            
                collector.on('end', () => {
                    const results = options.map((opt, i) => {
                        const voteCount = Object.values(votes).filter(v => v === emojis[i]).length;
                        return `${emojis[i]} ${opt} — **${voteCount}** vote(s)`;
                    }).join('\n');
            
                    message.channel.send({
                        embeds: [{
                            title: `🏆 Hasil Voting: ${question}`,
                            description: results,
                            color: 0xFFD700
                        }]
                    });
                });
            
                return;
                
            case 'createQuizWithAnswer':
                await message.channel.sendTyping();
                
                if (!parsed.question || !parsed.options || !parsed.answer) {
                    return message.reply("⚠️ Quiz tidak valid. Pastikan ada pertanyaan, opsi, dan jawaban benar.");
                }
            
                const { question: qA, options: optsA, answer: ansA, time: tA } = parsed;
                const quizTimeA = (tA && Number(tA)) || 30;
                const emojisA = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];
                const optionListA = optsA.map((opt, i) => `${emojisA[i]} ${opt}`).join('\n');
            
                await message.delete();
                const quizMsgA = await message.channel.send({
                    embeds: [{
                        title: `📢 Quiz: ${qA}`,
                        description: `${optionListA}\n\n⏱ Waktu: ${quizTimeA} detik\nReact dengan emoji untuk menjawab!`,
                        color: 0x00AE86
                    }]
                });
            
                for (let i = 0; i < optsA.length; i++) {
                    await quizMsgA.react(emojisA[i]);
                }
            
                const votesA = {};
                const filterA = (reaction, user) => emojisA.includes(reaction.emoji.name) && !user.bot;
                const collectorA = quizMsgA.createReactionCollector({ filter: filterA, time: quizTimeA * 1000 });
            
                collectorA.on('collect', (reaction, user) => {
                    votesA[user.id] = reaction.emoji.name;
                });
            
                collectorA.on('end', () => {
                    const resultsA = optsA.map((opt, i) => {
                        const voteCount = Object.values(votesA).filter(v => v === emojisA[i]).length;
                        const isCorrect = opt === ansA ? " ✅ **(Benar)**" : "";
                        return `${emojisA[i]} ${opt} — **${voteCount}** vote(s)${isCorrect}`;
                    }).join('\n');
            
                    message.channel.send({
                        embeds: [{
                            title: `🏆 Hasil Quiz: ${qA}`,
                            description: resultsA + `\n\n**Jawaban Benar:** ${ansA}`,
                            color: 0x2ecc71
                        }]
                    });
                });
            
                return;
                
            case 'createRandomQuiz':
                await message.channel.sendTyping();
                
                // Minta AI untuk generate pertanyaan True/False
                const randomTFQuizData = await askAI(message, userId, `
                    Buat 1 pertanyaan quiz True/False (Benar/Salah) tentang pengetahuan umum dengan format JSON:
                    {
                        "question": "<PERTANYAAN>",
                        "answer": "True" atau "False",
                        "time": 10
                    }
                    Pastikan JSON valid tanpa teks tambahan dan tanpa diawali apapun seperti \`\`\`json.
                `);
            
                let randomTFQuiz;
                try {
                    randomTFQuiz = JSON.parse(randomTFQuizData);
                } catch (err) {
                    console.error("Gagal parse True/False quiz:", randomTFQuizData);
                    return message.reply("❌ Gagal membuat quiz true/false random. Coba lagi.");
                }
            
                if (!randomTFQuiz.question || !randomTFQuiz.answer) {
                    return message.reply("❌ Data quiz True/False tidak valid.");
                }
            
                const { question: tfQ, answer: tfAns, time: tfT } = randomTFQuiz;
                const quizTimeTF = (tfT && Number(tfT)) || 10;
                const tfOptions = ["True", "False"];
                const tfEmojis = ['✅', '❌'];
            
                const tfOptionList = `${tfEmojis[0]} True\n${tfEmojis[1]} False`;
            
                const tfQuizMsg = await message.channel.send({
                    embeds: [{
                        title: `🎲 Quiz True/False: ${tfQ}`,
                        description: `${tfOptionList}\n\n⏱ Waktu: ${quizTimeTF} detik\nReact untuk menjawab!`,
                        color: 0x1abc9c
                    }]
                });
            
                for (const emoji of tfEmojis) {
                    await tfQuizMsg.react(emoji);
                }
            
                const tfVotes = {};
                const filterTF = (reaction, user) => tfEmojis.includes(reaction.emoji.name) && !user.bot;
                const collectorTF = tfQuizMsg.createReactionCollector({ filter: filterTF, time: quizTimeTF * 1000 });
            
                collectorTF.on('collect', (reaction, user) => {
                    tfVotes[user.id] = reaction.emoji.name;
                });
            
                collectorTF.on('end', () => {
                    const resultTrue = Object.values(tfVotes).filter(v => v === '✅').length;
                    const resultFalse = Object.values(tfVotes).filter(v => v === '❌').length;
            
                    message.channel.send({
                        embeds: [{
                            title: `🏆 Hasil Quiz True/False: ${tfQ}`,
                            description: `
                                ✅ True — **${resultTrue}** vote(s)${tfAns === "True" ? " ✅ **(Benar)**" : ""}
                                \n❌ False — **${resultFalse}** vote(s)${tfAns === "False" ? " ✅ **(Benar)**" : ""}
                                \n**Jawaban Benar:** ${tfAns}
                            `,
                            color: 0xf39c12
                        }]
                    });
                });
            
                return;
                
            /* case 'searchKomik':
            - Cari komik: {"action": "searchKomik", "keyword": "<JUDUL_KOMIK>"}
                await message.channel.sendTyping();
                
                if (!parsed.keyword || parsed.keyword.trim().length === 0) {
                    return message.reply('⚠️ Tolong berikan judul komik yang ingin dicari.');
                }
            
                // Jalankan fungsi execute dari command komik
                return komikCommand.execute(message, [parsed.keyword], client); */
                
            case 'summarize':
                await message.channel.sendTyping();
                
                if (!parsed.url) return message.reply("⚠️ Berikan URL artikel yang ingin diringkas.");
            
                try {
                    const res = await axios.get(parsed.url);
                    const $ = cheerio.load(res.data);
                    const textContent = $('p').text().replace(/\s+/g, ' ').trim().slice(0, 5000); // Batas 5000 karakter
            
                    const summary = await askAI(message, userId, `Ringkas artikel berikut dalam bahasa Indonesia:\n\n${textContent}`);
                    return message.reply(`📄 **Ringkasan:**\n${summary.slice(0, 1800)}${summary.length > 1800 ? '...' : ''}`);
                } catch (err) {
                    console.error(err);
                    return message.reply("❌ Gagal mengambil atau meringkas artikel.");
                }
                
            case 'youtubeInfo': {
                if (!parsed.url || !parsed.url.startsWith("http")) {
                    return message.reply("⚠️ Berikan URL YouTube yang valid.");
                }
            
                await message.channel.sendTyping();
            
                exec(`yt-dlp -j ${parsed.url}`, (error, stdout, stderr) => {
                    if (error || stderr) {
                        console.error(`yt-dlp error: ${stderr || error.message}`);
                        return message.reply("❌ Gagal mengambil info YouTube.");
                    }
            
                    try {
                        const data = JSON.parse(stdout);
                        const duration = data.duration ? formatDuration(data.duration) : '-';
                        const embed = {
                            title: data.title,
                            url: data.webpage_url,
                            image: { url: data.thumbnail },
                            fields: [
                                { name: "Channel", value: data.uploader || '-', inline: true },
                                { name: "Views", value: data.view_count ? data.view_count.toLocaleString() : '-', inline: true },
                                { name: "Durasi", value: duration, inline: true }
                            ],
                            color: 0xFF0000
                        };
                        return message.reply({ embeds: [embed] });
                    } catch (err) {
                        console.error(err);
                        return message.reply("❌ Error parsing data YouTube.");
                    }
                });
                return;
            }
                
            case 'youtubeDownloadAudio': {
                if (!parsed.url || !parsed.url.startsWith("http")) {
                    return message.reply("⚠️ Berikan URL YouTube yang valid.");
                }
            
                await message.channel.sendTyping();
            
                // Jalankan yt-dlp untuk audio (format mp3) dengan output ke stdout
                const ytdlpAudio = spawn('yt-dlp', [
                    '-x', '--audio-format', 'mp3',
                    '-o', '-',
                    parsed.url
                ], { stdio: ['ignore', 'pipe', 'inherit'] });
            
                let audioDataChunks = [];
            
                ytdlpAudio.stdout.on('data', (chunk) => audioDataChunks.push(chunk));
            
                ytdlpAudio.on('close', async (code) => {
                    if (code !== 0) {
                        console.error(`yt-dlp exited with code ${code}`);
                        return message.reply("❌ Gagal download audio.");
                    }
            
                    try {
                        const ytAudioBuffer = Buffer.concat(audioDataChunks);
            
                        // Cek batas upload Discord (25MB)
                        const fileSizeMB = ytAudioBuffer.length / (1024 * 1024);
                        if (fileSizeMB > 25) {
                            return message.reply(`⚠️ Audio terlalu besar (${fileSizeMB.toFixed(2)} MB) untuk diunggah ke Discord.`);
                        }
            
                        // Kirim hasil stream
                        const audioAttachment = new AttachmentBuilder(Readable.from(ytAudioBuffer), { name: `audio.mp3` });
                        await message.reply({ content: "🎵 **Audio berhasil diunduh:**", files: [audioAttachment] });
                    } catch (err) {
                        console.error(err);
                        return message.reply("❌ Gagal mengirim audio.");
                    }
                });
            
                return;
            }
                
            case 'youtubeDownloadVideo': {
                if (!parsed.url || !parsed.url.startsWith("http")) {
                    return message.reply("⚠️ Berikan URL YouTube yang valid.");
                }
            
                await message.channel.sendTyping();
            
                // Jalankan yt-dlp dalam mode stream
                const ytdlpVid = spawn('yt-dlp', [
                    '-f', 'mp4',
                    '-o', '-',
                    parsed.url
                ], { stdio: ['ignore', 'pipe', 'inherit'] });
            
                let vidDataChunks = [];
            
                ytdlpVid.stdout.on('data', (chunk) => vidDataChunks.push(chunk));
            
                ytdlpVid.on('close', async (code) => {
                    if (code !== 0) {
                        console.error(`yt-dlp exited with code ${code}`);
                        return message.reply("❌ Gagal download video.");
                    }
            
                    try {
                        const ytVideoBuffer = Buffer.concat(vidDataChunks);
            
                        // Cek batas upload Discord (25MB)
                        const fileSizeMB = ytVideoBuffer.length / (1024 * 1024);
                        if (fileSizeMB > 25) {
                            return message.reply(`⚠️ Video terlalu besar (${fileSizeMB.toFixed(2)} MB) untuk diunggah ke Discord.`);
                        }
            
                        // Kirim hasil stream
                        const vidAttachment = new AttachmentBuilder(Readable.from(ytVideoBuffer), { name: `video.mp4` });
                        await message.reply({ content: "🎥 **Video berhasil diunduh:**", files: [vidAttachment] });
                    } catch (err) {
                        console.error(err);
                        return message.reply("❌ Gagal mengirim video.");
                    }
                });
            
                return;
            }
                
            case 'currencyConvert':
                await message.channel.sendTyping();
                const from = parsed.from ? parsed.from.toUpperCase() : null;
                const to = parsed.to ? parsed.to.toUpperCase() : null;
                const amount = parsed.amount ? parseFloat(parsed.amount) : null;
            
                if (!from || !to || isNaN(amount)) {
                    return message.reply("⚠️ Format salah. Contoh: ubah 100 USD ke IDR");
                }
            
                try {
                    const res = await axios.get(`https://api.frankfurter.app/latest?amount=${amount}&from=${from}&to=${to}`);
                    if (!res.data.rates || !res.data.rates[to]) return message.reply("❌ Gagal mengonversi mata uang.");
            
                    const result = res.data.rates[to];
                    return message.reply(`💱 **${amount} ${from} = ${result.toFixed(2)} ${to}**`);
                } catch (err) {
                    console.error(err);
                    return message.reply("❌ Gagal mengambil data konversi.");
                }
                
            case 'tiktokDownload': {
                if (!parsed.url || !parsed.url.startsWith("http")) {
                    return message.reply("⚠️ Berikan URL TikTok yang valid.");
                }
            
                await message.channel.sendTyping();
            
                // Jalankan yt-dlp dengan mode binary
                const ytdlp = spawn('yt-dlp', [
                '--cookies', 
                'tt_cookies.txt', 
                '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                '-f', 
                'mp4', 
                '-o', 
                '-', parsed.url
                ], { stdio: ['ignore', 'pipe', 'inherit'] });
            
                let dataChunks = [];
                ytdlp.stdout.on('data', (chunk) => dataChunks.push(chunk));
            
                ytdlp.on('close', async (code) => {
                    if (code !== 0) {
                        return message.reply("❌ Gagal download video TikTok.");
                    }
            
                    const videoBuffer = Buffer.concat(dataChunks);
            
                    // Cek ukuran file
                    if (videoBuffer.length > 25 * 1024 * 1024) {
                        return message.reply(`⚠️ Video terlalu besar (${(videoBuffer.length / 1024 / 1024).toFixed(2)} MB).`);
                    }
            
                    const attachment = new AttachmentBuilder(Readable.from(videoBuffer), { name: `tiktok.mp4` });
                    return message.reply({ content: "🎥 **Video TikTok berhasil diunduh:**", files: [attachment] });
                });
            
                return;
            }
            
            case 'instagramDownload': {
                if (!parsed.url || !parsed.url.includes("instagram.com")) {
                    return message.reply("⚠️ Berikan URL Instagram Reels yang valid.");
                }
            
                await message.channel.sendTyping();
            
                const igdlp = spawn('yt-dlp', [
                    '-f', 'mp4', '--no-playlist', 
                    '--cookies', 'ig_cookies.txt',
                    '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    '-o', '-',
                    parsed.url
                ], { stdio: ['ignore', 'pipe', 'inherit'] });
            
                let dataChanks = [];
                igdlp.stdout.on('data', (chunk) => dataChanks.push(chunk));
            
                igdlp.on('close', async (code) => {
                    if (code !== 0) {
                        return message.reply("❌ Gagal download Reels Instagram.");
                    }
            
                    const igBuffer = Buffer.concat(dataChanks);
                    if (igBuffer.length > 25 * 1024 * 1024) {
                        return message.reply(`⚠️ Video terlalu besar (${(igBuffer.length / 1024 / 1024).toFixed(2)} MB).`);
                    }
            
                    const igAttachment = new AttachmentBuilder(Readable.from(igBuffer), { name: `reels.mp4` });
                    return message.reply({ content: "🎥 **Instagram Reels berhasil diunduh:**", files: [igAttachment] });
                });
            
                return;
            }
            
            case 'translateText': {
                if (!parsed.text || !parsed.to) {
                    return message.reply("⚠️ Format salah. Contoh: translate 'Hello' ke Indonesia.");
                }
                
                await message.channel.sendTyping();
            
                const translation = await askAI(message, message.author.id, `
                    Tolong terjemahkan teks berikut ke bahasa ${parsed.to}:
                    "${parsed.text}"
                `);
            
                return message.reply(`🌐 **Terjemahan (${parsed.to}):**\n${translation}`);
            }
            
            case 'meme': {
                const memeText = parsed.text || '';
                const [top, bottom] = memeText.split('|').map(t => t.trim());
            
                if (!top || !bottom) {
                    return message.reply("⚠️ Format salah. Contoh: `meme teks atas | teks bawah`");
                }
            
                await message.channel.sendTyping();
            
                try {
                    const res = await axios.post('https://api.imgflip.com/caption_image', null, {
                        params: {
                            template_id: 112126428, // template 'Distracted Boyfriend'
                            username: process.env.IMGFLIP_USER,
                            password: process.env.IMGFLIP_PASS,
                            text0: top,
                            text1: bottom
                        }
                    });
            
                    if (res.data.success) {
                        return message.reply({ content: "😂 Meme berhasil dibuat:", files: [res.data.data.url] });
                    } else {
                        return message.reply("❌ Gagal membuat meme.");
                    }
                } catch (err) {
                    console.error(err);
                    return message.reply("❌ Terjadi kesalahan saat membuat meme.");
                }
            }
            
            case 'tts': {
                const googleTTS = require('google-tts-api');
                const axios = require('axios');
            
                const text = parsed.text;
                if (!text) return message.reply("⚠️ Masukkan teks yang ingin diucapkan. Contoh: `tts Halo dunia`");
            
                await message.channel.sendTyping();
            
                try {
                    // Dapatkan URL audio dari Google TTS
                    const ttsUrl = googleTTS.getAudioUrl(text, {
                        lang: 'id',
                        slow: false,
                        host: 'https://translate.google.com',
                    });
            
                    // Download audio buffer
                    const res = await axios.get(ttsUrl, { responseType: 'arraybuffer' });
                    const buffer = Buffer.from(res.data, 'utf-8');
            
                    return message.reply({ 
                        content: "🔊 **Hasil TTS:**", 
                        files: [{ attachment: buffer, name: 'tts.mp3' }] 
                    });
                } catch (err) {
                    console.error(err);
                    return message.reply("❌ Gagal membuat audio TTS.");
                }
            }
            
            /* case 'screenshotSite': {
                if (!parsed.url || !parsed.url.startsWith("http")) {
                    return message.reply("⚠️ Berikan URL website yang valid.");
                }
            
                await message.channel.sendTyping();
            
                try {
                    const browser = await puppeteer.launch({ headless: 'new' });
                    const page = await browser.newPage();
                    await page.goto(parsed.url, { waitUntil: 'networkidle2', timeout: 30000 });
                    const screenshot = await page.screenshot({ fullPage: true });
                    await browser.close();
            
                    return message.reply({ content: `📸 Screenshot dari ${parsed.url}`, files: [{ attachment: screenshot, name: 'screenshot.png' }] });
                } catch (err) {
                    console.error(err);
                    return message.reply("❌ Gagal mengambil screenshot website.");
                }
            } */
            
            case 'infoSignal': {
                const pair = parsed.symbol || 'XAUUSD';
                await message.channel.sendTyping();
            
                const priceData = await getRealTimePrice(pair);
                if (!priceData) return message.reply(`⚠️ Gagal ambil harga real-time untuk ${pair}.`);
            
                const current = parseFloat(priceData.current);
                const high = parseFloat(priceData.high) || current * 1.01;
                const low = parseFloat(priceData.low) || current * 0.99;
            
                // Tentukan signal
                const signal = (current <= (low + (high - low) / 2)) ? 'BUY' : 'SELL';
            
                // Hitung entry zone ±0.1%
                const entryLow = (current * 0.999).toFixed(2);
                const entryHigh = (current * 1.001).toFixed(2);
                const entry_zone = `${entryLow} - ${entryHigh}`;
            
                // Hitung SL & TP
                const sl = (signal === 'SELL' ? current * 1.005 : current * 0.995).toFixed(2);
                const tp = [
                    (signal === 'SELL' ? current * 0.998 : current * 1.002).toFixed(2),
                    (signal === 'SELL' ? current * 0.996 : current * 1.004).toFixed(2),
                    (signal === 'SELL' ? current * 0.994 : current * 1.006).toFixed(2)
                ];
            
                // Minta AI untuk bikin analysis_detail
                const aiResponsed = await askAI(message, message.author.id, `
                    Kamu adalah AI analis trading.
                    Berdasarkan data berikut:
                    - Pair: ${pair}
                    - Current Price: ${current}
                    - Signal: ${signal}
                    - Entry Zone: ${entry_zone}
                    - SL: ${sl}
                    - TP: ${tp.join(', ')}
                    Buat analisis singkat (2-3 kalimat) kenapa signal ini dipilih.
                    Jawab langsung dengan teks analisis saja.
                `);
            
                const data = {
                    pair,
                    current_price: current.toFixed(2),
                    change: priceData.changePercent,
                    range_24h: `${priceData.low} - ${priceData.high}`,
                    volume: `${priceData.volume.toString()}`,
                    confidence: '80% (MEDIUM)',
                    signal,
                    entry_zone,
                    sl,
                    tp,
                    risk_reward: '1:1.5',
                    analysis_detail: aiResponsed.trim(),
                    source: priceData.source
                };
            
                // Buat chart
                const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
                    type: 'line',
                    data: {
                        labels: ['TP3', 'TP2', 'TP1', 'Entry', 'SL'],
                        datasets: [{
                            label: data.pair,
                            data: [data.tp[2], data.tp[1], data.tp[0], current, data.sl],
                            borderColor: data.signal === 'SELL' ? 'red' : 'green',
                            fill: false,
                        }]
                    }
                }))}`;
            
                // Embed
                const embed = new EmbedBuilder()
                    .setTitle(`${data.pair} Analysis Signal`)
                    .setColor(data.signal === 'SELL' ? '#ff0000' : '#00ff00')
                    .setImage(chartUrl)
                    .addFields(
                        { name: 'Pair', value: data.pair, inline: true },
                        { name: 'Current Price', value: `${data.current_price} (${data.change})`, inline: true },
                        { name: 'Range 24h', value: data.range_24h, inline: false },
                        { name: 'Volume', value: data.volume, inline: true },
                        { name: 'Confidence', value: data.confidence, inline: true },
                        { name: 'Signal', value: data.signal, inline: true },
                        { name: 'Entry Zone', value: data.entry_zone, inline: true },
                        { name: 'SL', value: data.sl, inline: true },
                        { name: 'TP', value: data.tp.join('\n'), inline: false },
                        { name: 'Risk/Reward', value: data.risk_reward, inline: true },
                        { name: 'Analysis Detail', value: data.analysis_detail || 'Tidak ada detail.', inline: false },
                        { name: 'Source', value: data.source, inline: false }
                    )
                    .setFooter({ text: 'Generated by Sistine AI Future Signal' });
            
                return message.reply({ embeds: [embed] });
            }

            case 'chat':
            default:
                const chatReply = await askAI(message, userId, `"${prompt}" adalah obrolan biasa, balas dengan obrolan hangat sesuai etika, sesuai pesan sistem mu dan jangan balas dengan JSON.`);
                const safeReply = chatReply && chatReply.trim() ? chatReply.slice(0, 2000) : "Maaf, Sistine mungkin sedang sibuk sekarang.";
                return await message.reply(safeReply);
        }
    } catch (err) {
        console.error(err);
        return message.reply(`❌ Error: ${err.message}`);
    }
    }
};