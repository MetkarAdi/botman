const mongoose = require('mongoose');

const disabledCommandSchema = new mongoose.Schema({
    name: { type: String, unique: true }
});

module.exports = mongoose.model('DisabledCommand', disabledCommandSchema);
