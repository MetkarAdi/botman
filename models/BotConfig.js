const mongoose = require('mongoose');

const botConfigSchema = new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
});

module.exports = mongoose.model('BotConfig', botConfigSchema);
