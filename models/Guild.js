const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    prefix: {
        type: String,
        default: '>>'
    },
    levellingEnabled: {
        type: Boolean,
        default: true
    },
    moderationEnabled: {
        type: Boolean,
        default: true
    },
    logChannel: {
        type: String,
        default: null
    },
    welcomeChannel: {
        type: String,
        default: null
    },
    welcomeMessage: {
        type: String,
        default: 'Welcome {user} to {server}!'
    },
    goodbyeChannel: {
        type: String,
        default: null
    },
    goodbyeMessage: {
        type: String,
        default: 'Goodbye {user}! We will miss you!'
    },
    autoRole: {
        type: String,
        default: null
    },
    xpMultiplier: {
        type: Number,
        default: 1.0
    },
    levelUpChannel: {
        type: String,
        default: null
    },
    ignoredChannels: {
        type: [String],
        default: []
    },
    ignoredRoles: {
        type: [String],
        default: []
    },
    mafiaCategoryId: {
        type: String,
        default: null
    },
    mafiaDiscussionTime: {
        type: Number,
        default: 150
    },
    mafiaNightTime: {
        type: Number,
        default: 45
    },
    mafiaVoteTime: {
        type: Number,
        default: 45
    }
}, { timestamps: true });

module.exports = mongoose.model('Guild', guildSchema);