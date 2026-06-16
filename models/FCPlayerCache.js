const mongoose = require('mongoose');

const fcPlayerCacheSchema = new mongoose.Schema({
    playerId: Number,
    playerName: String,
    playerPhoto: String,
    club: String,
    clubLogo: String,
    league: String,
    position: String,
    rating: Number,
    stats: Object,
    cachedAt: {
        type: Date,
        default: Date.now,
        expires: 86400
    }
});

fcPlayerCacheSchema.index({ playerId: 1 }, { unique: true });

module.exports = mongoose.model('FCPlayerCache', fcPlayerCacheSchema);
