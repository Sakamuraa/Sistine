const { Schema, model } = require("mongoose");

const SchemaChannel = new Schema({
    channelId: {
        type: String,
        required: true,
    },
    roleId: {
        type: String,
        required: false,
    },
    description: {
        type: String,
        required: false,
    },
}, { timestamps: true }
);

module.exports = model("channel", SchemaChannel)