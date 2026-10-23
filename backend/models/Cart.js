const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    cart_item_id: { type: Number },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    product_id: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 }
});

const cartSchema = new mongoose.Schema({
    cart_id: { type: Number, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    user_id: { type: Number, index: true },
    items: [cartItemSchema],
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Cart', cartSchema);
