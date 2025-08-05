// src/models/Customer.js

const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    email: {
        type: String,
    },
    address: {
        type: String,
    },
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);
