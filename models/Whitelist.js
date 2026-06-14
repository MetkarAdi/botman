const mongoose = require('mongoose');

const whitelistSchema = new mongoose.Schema({
    userId: { type: String, unique: true },
    guildId: { type: String }
});

module.exports = mongoose.model('Whitelist', whitelistSchema);
