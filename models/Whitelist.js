const mongoose = require('mongoose');

const whitelistSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true }
});

whitelistSchema.index({ userId: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('Whitelist', whitelistSchema);
