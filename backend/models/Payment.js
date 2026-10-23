const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    payment_id: { type: Number, unique: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
    order_id: { type: Number, unique: true, index: true },
    payment_method: { 
        type: String, 
        enum: ['Cash on Delivery', 'UPI'], 
        required: true 
    },
    payment_status: { 
        type: String, 
        enum: ['Pending', 'Completed', 'Failed'], 
        default: 'Pending' 
    },
    payment_date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Payment', paymentSchema);
