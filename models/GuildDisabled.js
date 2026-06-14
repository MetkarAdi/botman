const mongoose = require('mongoose');

const guildDisabledSchema = new mongoose.Schema({
    guildId: String,
    type: { type: String, enum: ['command', 'category'] },
    name: String
});

guildDisabledSchema.index({ guildId: 1, type: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('GuildDisabled', guildDisabledSchema);
