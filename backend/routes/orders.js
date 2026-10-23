const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Middleware: Customer login check
const isCustomer = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please login to view/place orders' });
    }
    next();
};

// Middleware: Admin check
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }
    next();
};

// Helper to format order with payment details for customer/admin display
async function attachPaymentAndFormat(orderDoc, userDoc = null) {
    const o = orderDoc.toObject ? orderDoc.toObject() : orderDoc;
    const payment = await Payment.findOne({ order_id: o.order_id });

    return {
        ...o,
        customer_name: userDoc ? userDoc.name : (o.user && o.user.name ? o.user.name : ''),
        customer_email: userDoc ? userDoc.email : (o.user && o.user.email ? o.user.email : ''),
        customer_phone: userDoc ? userDoc.phone : (o.user && o.user.phone ? o.user.phone : ''),
        payment_id: payment ? payment.payment_id : null,
        payment_method: payment ? payment.payment_method : 'Cash on Delivery',
        payment_status: payment ? payment.payment_status : 'Pending',
        payment_date: payment ? payment.payment_date : o.order_date
    };
}

// 1. Place an Order (Transaction-safe: Cart -> Order & Items -> Payment & Stock reduction)
router.post('/place', isCustomer, async (req, res) => {
    const userId = req.session.user.user_id;
    const { delivery_address, payment_method } = req.body;

    if (!delivery_address || !delivery_address.trim() || !payment_method) {
        return res.status(400).json({ success: false, message: 'Delivery address and Payment method are required' });
    }

    const validPaymentMethods = ['Cash on Delivery', 'UPI'];
    if (!validPaymentMethods.includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    try {
        const cart = await Cart.findOne({ user_id: userId }).populate('items.product');
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty. Add products before checkout.' });
        }

        // Validate stock for all items
        for (const item of cart.items) {
            const product = item.product;
            if (!product) {
                return res.status(400).json({ success: false, message: 'A product in your cart is no longer available.' });
            }
            if (item.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${product.product_name}. Available: ${product.stock}`
                });
            }
        }

        // Calculate total amount & prepare embedded order items
        let totalAmount = 0;
        const orderItems = [];

        for (const item of cart.items) {
            const p = item.product;
            const price = Number(p.price);
            totalAmount += price * item.quantity;

            orderItems.push({
                order_item_id: Date.now() + Math.floor(Math.random() * 1000),
                product: p._id,
                product_id: p.product_id,
                product_name: p.product_name,
                unit: p.unit || 'kg',
                image: p.image || '/images/products/default_product.png',
                quantity: item.quantity,
                price: price
            });
        }

        // Atomically decrease product stock
        for (const item of cart.items) {
            const updated = await Product.findOneAndUpdate(
                { _id: item.product._id, stock: { $gte: item.quantity } },
                { $inc: { stock: -item.quantity } },
                { returnDocument: 'after' }
            );
            if (!updated) {
                return res.status(400).json({
                    success: false,
                    message: `Could not reserve stock for ${item.product.product_name}. Please try again.`
                });
            }
        }

        // Generate next order_id
        const lastOrder = await Order.findOne().sort({ order_id: -1 }).select('order_id');
        const nextOrderId = (lastOrder && lastOrder.order_id) ? lastOrder.order_id + 1 : 1;

        const userDoc = await User.findOne({ user_id: userId });

        // Create Order
        const newOrder = await Order.create({
            order_id: nextOrderId,
            user: userDoc._id,
            user_id: userId,
            order_date: new Date(),
            total_amount: totalAmount,
            delivery_address: delivery_address.trim(),
            order_status: 'Pending',
            items: orderItems
        });

        // Generate next payment_id and record Payment
        const lastPayment = await Payment.findOne().sort({ payment_id: -1 }).select('payment_id');
        const nextPaymentId = (lastPayment && lastPayment.payment_id) ? lastPayment.payment_id + 1 : 1;
        const paymentStatus = payment_method === 'UPI' ? 'Completed' : 'Pending';

        await Payment.create({
            payment_id: nextPaymentId,
            order: newOrder._id,
            order_id: newOrder.order_id,
            payment_method: payment_method,
            payment_status: paymentStatus,
            payment_date: new Date()
        });

        // Empty customer cart
        cart.items = [];
        await cart.save();

        res.json({
            success: true,
            message: 'Order placed successfully!',
            order_id: newOrder.order_id
        });
    } catch (err) {
        console.error('Place order error:', err);
        res.status(500).json({ success: false, message: 'Failed to process order. Please try again.' });
    }
});

// 2. Display all orders placed by particular customer
router.get('/my-orders', isCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;
        const rawOrders = await Order.find({ user_id: userId }).sort({ order_date: -1 });

        const orders = [];
        for (const ord of rawOrders) {
            orders.push(await attachPaymentAndFormat(ord));
        }

        res.json({ success: true, orders });
    } catch (err) {
        console.error('Fetch my orders error:', err);
        res.status(500).json({ success: false, message: 'Error fetching orders' });
    }
});

// 3. Admin: View all customer orders with customer & payment information
router.get('/admin/all-orders', isAdmin, async (req, res) => {
    try {
        const rawOrders = await Order.find()
            .populate('user', 'name email phone')
            .sort({ order_date: -1 });

        const orders = [];
        for (const ord of rawOrders) {
            orders.push(await attachPaymentAndFormat(ord, ord.user));
        }

        res.json({ success: true, orders });
    } catch (err) {
        console.error('Admin all orders error:', err);
        res.status(500).json({ success: false, message: 'Error fetching customer orders' });
    }
});

// 4. Admin: Get full details of a specific single order
router.get('/admin/order/:order_id', isAdmin, async (req, res) => {
    try {
        const orderIdParam = req.params.order_id;
        const query = !isNaN(orderIdParam) ? { order_id: Number(orderIdParam) } : { _id: orderIdParam };

        const orderDoc = await Order.findOne(query).populate('user', 'name email phone');
        if (!orderDoc) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const formatted = await attachPaymentAndFormat(orderDoc, orderDoc.user);
        res.json({ success: true, order: formatted });
    } catch (err) {
        console.error('Admin single order error:', err);
        res.status(500).json({ success: false, message: 'Error fetching order details' });
    }
});

// 5. Admin: Update order status
router.put('/admin/status/:order_id', isAdmin, async (req, res) => {
    try {
        const orderIdParam = req.params.order_id;
        const { order_status } = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
        
        if (!validStatuses.includes(order_status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }

        const query = !isNaN(orderIdParam) ? { order_id: Number(orderIdParam) } : { _id: orderIdParam };
        const order = await Order.findOne(query);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.order_status = order_status;
        await order.save();

        // If order delivered, mark payment completed
        if (order_status === 'Delivered') {
            await Payment.findOneAndUpdate(
                { order_id: order.order_id },
                { payment_status: 'Completed' }
            );
        }

        res.json({ success: true, message: `Order #${order.order_id} status updated to ${order_status}` });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
});

module.exports = router;
