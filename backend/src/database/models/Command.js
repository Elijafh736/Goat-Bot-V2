const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    execute: {
        type: Function,
        required: true,
    },
    aliases: {
        type: [String],
        default: [],
    },
}, { timestamps: true });

module.exports = mongoose.model('Command', commandSchema);