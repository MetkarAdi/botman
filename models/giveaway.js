const mongoose = require('mongoose');

const giveawaySchema = new mongoose.Schema({
    guildId:     { type: String, required: true },
    channelId:   { type: String, required: true },
    messageId:   { type: String, default: null },       // the giveaway embed message
    hostId:      { type: String, required: true },
    prize:       { type: String, required: true },
    description: { type: String, default: null },       // optional extra description
    winnerCount: { type: Number, default: 1 },
    endsAt:      { type: Date, required: true },
    endedAt:     { type: Date, default: null },
    ended:       { type: Boolean, default: false },
    cancelled:   { type: Boolean, default: false },
    entries:     { type: [String], default: [] },       // userIds who entered
    winners:     { type: [String], default: [] },       // userId(s) of winner(s)
    // Requirements
    requiredRoles:      { type: [String], default: [] }, // roleIds user must have (any one)
    requiredAllRoles:   { type: [String], default: [] }, // roleIds user must have (all)
    minAccountAge:      { type: Number, default: 0 },    // minimum account age in days
    minServerAge:       { type: Number, default: 0 },    // minimum server membership in days
}, { timestamps: true });

giveawaySchema.index({ guildId: 1, ended: 1 });
giveawaySchema.index({ endsAt: 1, ended: 1 });

module.exports = mongoose.model('Giveaway', giveawaySchema);