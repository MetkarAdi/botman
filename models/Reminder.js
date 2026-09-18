const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    message: { type: String, required: true },
    sourceUrl: { type: String, default: null },
    remindAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    snoozedAt: { type: Date, default: null }
});

reminderSchema.index({ remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
