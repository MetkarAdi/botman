const mongoose = require('mongoose');

const fcCooldownSchema = new mongoose.Schema({
    userId: String,
    chargesUsed: {
        type: Number,
        default: 0
    },
    lastResetAt: {
        type: Date,
        default: () => new Date(0)
    }
});

fcCooldownSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model('FCCooldown', fcCooldownSchema);
