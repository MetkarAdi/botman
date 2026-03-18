const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    xp: {
        type: Number,
        default: 0
    },
    level: {
        type: Number,
        default: 1
    },
    messages: {
        type: Number,
        default: 0
    },
    lastMessage: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index to ensure unique user per guild
levelSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Level', levelSchema);
