const mongoose = require('mongoose');

const pkmnCardSchema = new mongoose.Schema({
    userId: String,
    cardId: String,
    packId: String,
    setId: String,
    setName: String,
    tcgdexId: String,
    localId: String,
    name: String,
    rarity: String,
    imageUrl: String,
    drawnAt: {
        type: Date,
        default: Date.now
    }
});

pkmnCardSchema.index({ userId: 1 });
pkmnCardSchema.index({ cardId: 1 }, { unique: true });
pkmnCardSchema.index({ tcgdexId: 1 });

module.exports = mongoose.model('PkmnCard', pkmnCardSchema);
