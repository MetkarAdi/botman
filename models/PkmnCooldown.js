const mongoose = require('mongoose');

const pkmnCooldownSchema = new mongoose.Schema({
    userId: String,
    lastPackAt: {
        type: Date,
        default: () => new Date(0)
    }
});

pkmnCooldownSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('PkmnCooldown', pkmnCooldownSchema);
