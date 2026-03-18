const mongoose = require('mongoose');

const accessListSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true
    },
    type: {
        type: String,
        enum: ['whitelist', 'blacklist'],
        required: true
    },
    reason: {
        type: String,
        default: 'No reason provided'
    },
    addedBy: {
        type: String,
        required: true
    },
    addedAt: {
        type: Date,
        default: Date.now
    },
    guildId: {
        type: String,
        default: null // null means global
    }
}, { timestamps: true });

module.exports = mongoose.model('AccessList', accessListSchema);
