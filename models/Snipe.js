const mongoose = require('mongoose');

const snipeSchema = new mongoose.Schema({
    channelId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    messageId: {
        type: String,
        required: true
    },
    authorId: {
        type: String,
        required: true
    },
    authorTag: {
        type: String,
        required: true
    },
    authorAvatar: {
        type: String,
        default: null
    },
    content: {
        type: String,
        default: null
    },
    attachments: {
        type: [String],
        default: []
    },
    embeds: {
        type: Number,
        default: 0
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Index for quick lookup
snipeSchema.index({ channelId: 1, timestamp: -1 });

module.exports = mongoose.model('Snipe', snipeSchema);
