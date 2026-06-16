const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
    key: String,
    guildId: String,
    value: mongoose.Schema.Types.Mixed
});

botConfigSchema.index({ key: 1, guildId: 1 }, { unique: true });

module.exports = mongoose.model('BotConfig', botConfigSchema);
