const mongoose = require('mongoose');

const logConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    enabled: {
        type: Boolean,
        default: false
    },
    logChannel: {
        type: String,
        default: null
    },
    // Individual log types
    messageDelete: {
        type: Boolean,
        default: true
    },
    messageEdit: {
        type: Boolean,
        default: true
    },
    memberJoin: {
        type: Boolean,
        default: true
    },
    memberLeave: {
        type: Boolean,
        default: true
    },
    voiceJoin: {
        type: Boolean,
        default: true
    },
    voiceLeave: {
        type: Boolean,
        default: true
    },
    voiceMove: {
        type: Boolean,
        default: true
    },
    modActions: {
        type: Boolean,
        default: true
    },
    roleCreate: {
        type: Boolean,
        default: false
    },
    roleDelete: {
        type: Boolean,
        default: false
    },
    channelCreate: {
        type: Boolean,
        default: false
    },
    channelDelete: {
        type: Boolean,
        default: false
    },
    banAdd: {
        type: Boolean,
        default: true
    },
    banRemove: {
        type: Boolean,
        default: true
    },
    nicknameChange: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('LogConfig', logConfigSchema);
