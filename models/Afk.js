const mongoose = require('mongoose');

const afkSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    reason: { type: String, default: 'AFK' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

afkSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Afk', afkSchema);