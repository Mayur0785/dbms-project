const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    order_item_id: { type: Number },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    product_id: { type: Number, required: true },
    product_name: { type: String, required: true },
    unit: { type: String, default: 'kg' },
    image: { type: String, default: '/images/products/default_product.png' },
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
});

const orderSchema = new mongoose.Schema({
    order_id: { type: Number, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    user_id: { type: Number, index: true },
    order_date: { type: Date, default: Date.now },
    total_amount: { type: Number, required: true, min: 0 },
    delivery_address: { type: String, required: true },
    order_status: { 
        type: String, 
        enum: ['Pending', 'Confirmed', 'Delivered', 'Cancelled'], 
        default: 'Pending' 
    },
    items: [orderItemSchema]
});

module.exports = mongoose.model('Order', orderSchema);
