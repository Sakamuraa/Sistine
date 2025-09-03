const mongoose = require('mongoose');
require('dotenv').config();

const youtubeChannelSchema = new mongoose.Schema({
    name: { type: String, required: true }, // YouTube channel name
    channelId: { type: String, required: true, unique: true }, // YouTube channel ID
    guildIds: { type: [String], required: true }, // Array of guild IDs associated with this channel
});

const reactionRoleSchema = new mongoose.Schema({
    guildId: String,
    messageId: String,
    reactions: [
        {
            emoji: String,
            roleId: String,
        },
    ],
});

const dropdownRoleSchema = new mongoose.Schema({
      guildId: String,
      channelId: String,
      messageId: String,
      reactions: [ 
          { 
              roleId: String, 
              label: String
          } 
      ]
});

const youtubeDescSchema = new mongoose.Schema({
    name: { type: String, required: true },
    guildId: { type: String, required: true }, // Guild ID for this configuration
    channelId: { type: String, required: true }, // Reference to the YouTube channel ID
    roleId: { type: String, required: true }, // Role ID for notifications
    discordChannelIds: { type: String, required: true }, // Array of Discord channel IDs
    description: { type: String, required: false }, // Guild-specific description
    upcomingEnabled: { type: Boolean, required: true },
    premiereEnabled: { type: Boolean, required: true }
});

const afkUserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    reason: { type: String, default: "AFK" },
    timestamp: { type: Date, default: Date.now },
});

const guildConfigSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    joinToCreate: [
        {
            category: { type: String, required: true },
            channelNameTemplate: { type: String, required: true },
            baseChannelId: { type: String, required: true }, // ID dari channel yang digunakan untuk join-to-create
        },
    ],
});

const twitterSchema = new mongoose.Schema({
	username: { type: String, required: true },
	guildIds: { type: [String], required: true }
});

const twitterFeatureSchema = new mongoose.Schema({
	username: { type: String, required: true },
	guildId: { type: String, required: true },
	discordChannelId: { type: String, required: true },
	language: { type: String, required: true },
	roleId: { type: String, required: false },
	retweet: { type: Boolean, required: true },
	replies: { type: Boolean, required: true },
	translation: { type: Boolean, required: true }
});

const logSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, required: true }
});

const YoutubeChannel = mongoose.model('YoutubeChannel', youtubeChannelSchema);
const RR = mongoose.model('ReactionRole', reactionRoleSchema);
const DR = mongoose.model("DropdownRole", dropdownRoleSchema);
const YoutubeDesc = mongoose.model('YoutubeDesc', youtubeDescSchema);
const AfkUser = mongoose.model('AfkUser', afkUserSchema);
const GuildConfig = mongoose.model("GuildConfig", guildConfigSchema);
const TwitterConfig = mongoose.model("TwitterConfig", twitterSchema);
const TwitterFeature = mongoose.model("TwitterFeature", twitterFeatureSchema);
const LogConfig = mongoose.model("LogConfig", logSchema);

async function connectToDatabase() {
    try {
        mongoose.set('strictQuery', false);
        await mongoose.connect(process.env.MONGO_CONNECTION);
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('Error connecting to MongoDB', error);
    }
}

module.exports = { YoutubeChannel, DR, RR, YoutubeDesc, AfkUser, GuildConfig, TwitterConfig, TwitterFeature, LogConfig, connectToDatabase };
