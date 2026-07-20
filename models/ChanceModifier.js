const mongoose = require('mongoose');

const chanceModifierSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 25
    }
}, { timestamps: true });

module.exports = mongoose.model('ChanceModifier', chanceModifierSchema);
