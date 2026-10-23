const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    product_id: { type: Number, unique: true, index: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    category_id: { type: Number, index: true },
    product_name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    unit: { type: String, default: 'kg' },
    image: { type: String, default: '/images/products/default_product.png' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
