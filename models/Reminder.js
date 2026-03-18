const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    channelId: { type: String, required: true },
    guildId: { type: String, required: true },
    message: { type: String, required: true },
    remindAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

reminderSchema.index({ remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);