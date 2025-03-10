const mongoose = require('mongoose');

const RequestSchema = new mongoose.Schema({
    material: String,
    budget: Number,
    room: String,
    deadline: String
});

module.exports = mongoose.model('Request', RequestSchema);
