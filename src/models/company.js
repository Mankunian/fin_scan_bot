const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
    name: String,
    region: String,
    channel: String,
});

module.exports = mongoose.model('Company', CompanySchema);
