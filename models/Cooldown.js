const mongoose = require('mongoose');

const cooldownSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    messageCount: {
        type: Number,
        default: 0
    },
    lastReset: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Compound index for unique user per guild
cooldownSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Cooldown', cooldownSchema);
