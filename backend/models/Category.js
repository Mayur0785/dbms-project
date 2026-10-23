const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    category_id: { type: Number, unique: true, index: true },
    category_name: { type: String, required: true, unique: true, trim: true }
});

module.exports = mongoose.model('Category', categorySchema);
