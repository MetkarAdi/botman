const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
    userId: String,
    username: String,
    role: String,          // VILLAGER, DETECTIVE, DOCTOR, VIGILANTE, GODFATHER, MAFIA, JESTER, EXECUTIONER
    isAlive: { type: Boolean, default: true },
    isSpectator: { type: Boolean, default: false },
    detectiveChecks: { type: Number, default: 0 },  // track how many times godfather has been checked
    nightAction: { type: String, default: null },    // target userId for night
    hasActed: { type: Boolean, default: false },
    viguilanteKilled: { type: Boolean, default: false }, // did vig kill innocent
    executionerTarget: { type: String, default: null },
    protectedBy: { type: String, default: null },    // doctor protected this player
    isBlackmailer: { type: Boolean, default: false }
}, { _id: false });

const mafiaGameSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    channelId: { type: String, default: null },       // game channel
    hostId: { type: String, required: true },
    phase: {
        type: String,
        enum: ['LOBBY', 'DISCUSSION', 'NOMINATION', 'VOTING', 'NIGHT', 'ENDED'],
        default: 'LOBBY'
    },
    dayNumber: { type: Number, default: 1 },
    players: [playerSchema],
    nominatedPlayer: { type: String, default: null },  // userId on trial
    votes: { type: Map, of: String, default: {} },     // voterId -> 'guilty'|'innocent'
    nightActions: { type: Map, of: String, default: {} }, // userId -> targetId
    joinMessageId: { type: String, default: null },
    phaseMessageId: { type: String, default: null },
    joinTimer: { type: Number, default: 120 },         // seconds
    discussionTime: { type: Number, default: 150 },
    nightTime: { type: Number, default: 45 },
    voteTime: { type: Number, default: 45 },
    phaseTimeout: { type: String, default: null },
    godfatherChecked: { type: Boolean, default: false }, // has godfather been detected once
    lastWill: { type: Map, of: String, default: {} },   // userId -> will text
    deadChat: { type: [String], default: [] },          // userIds who can spectate
    categoryId: { type: String, default: null },
    startedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('MafiaGame', mafiaGameSchema);