const SPAM_PATTERN = /(discord\.gg\/[A-Za-z0-9]+)|(discord\.com\/invite\/[A-Za-z0-9]+)|@everyone|@here/i;

// Penyimpanan data spam per user
const spamCounter = new Map();

const WHITELIST_ROLES = ['847392300194988053']; 
const ADMIN_LOG_CHANNEL = '1358053618837622986'; 

module.exports = async (message, client) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    // Cek whitelist role
    const member = message.member;
    if (member.roles.cache.some(role => WHITELIST_ROLES.includes(role.id))) return;

    // Cek pola spam
    if (SPAM_PATTERN.test(message.content)) {
        const userId = message.author.id;
        const now = Date.now();
        const limit = 3; // pesan spam maksimal
        const windowTime = 3000; // 3 detik

        // Hapus pesan spam
        await message.delete().catch(() => {});

        // Hitung spam
        if (!spamCounter.has(userId)) {
            spamCounter.set(userId, []);
        }
        const timestamps = spamCounter.get(userId);
        timestamps.push(now);

        // Filter timestamp dalam jendela waktu 3 detik
        spamCounter.set(
            userId,
            timestamps.filter(ts => now - ts < windowTime)
        );

        // Jika spam melebihi limit
        if (spamCounter.get(userId).length >= limit) {
            try {
                // Timeout user 5 menit
                await member.timeout(180 * 60 * 1000, 'Spam link undangan/@everyone');
                spamCounter.set(userId, []); // reset counter

                // Kirim log ke channel admin
                if (ADMIN_LOG_CHANNEL) {
                    const logChannel = client.channels.cache.get(ADMIN_LOG_CHANNEL);
                    if (logChannel) {
                        logChannel.send(`⚠️ **${message.author}** (${userId}) di-timeout selama 3 jam karena spam.`);
                    }
                }

                return message.channel.send(
                    `🚨 **${message.author.tag}** telah di-timeout karena spam.`
                );
            } catch (err) {
                console.error(err);
            }
        } else {
            return message.channel.send(
                `⚠️ **${message.author.tag}**, dilarang spam link undangan/@everyone.`
            );
        }
    }
};