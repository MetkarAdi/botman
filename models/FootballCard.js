const mongoose = require('mongoose');

const footballCardSchema = new mongoose.Schema({
    userId: String,
    cardId: String,
    playerId: Number,
    playerName: String,
    playerPhoto: String,
    club: String,
    clubLogo: String,
    league: String,
    position: String,
    rating: Number,
    rarity: {
        type: String,
        enum: ['Basic', 'Common', 'Rare', 'Epic', 'Legendary']
    },
    stats: {
        goals: Number,
        assists: Number,
        appearances: Number,
        passAccuracy: Number,
        dribbles: Number,
        keyPasses: Number,
        yellowCards: Number,
        redCards: Number
    },
    drawnAt: {
        type: Date,
        default: Date.now
    }
});

footballCardSchema.index({ userId: 1 });
footballCardSchema.index({ cardId: 1 }, { unique: true });

module.exports = mongoose.model('FootballCard', footballCardSchema);
