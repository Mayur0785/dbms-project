const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const User = require('../models/User');
const Order = require('../models/Order');

// Middleware: Admin check
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
};

// Admin Dashboard Summary Cards & Aggregation Queries
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const totalCustomers = await User.countDocuments({ role: 'customer' });
        const totalOrders = await Order.countDocuments();

        // Calculate total sales using MongoDB aggregation pipeline (excluding Cancelled orders)
        const salesAgg = await Order.aggregate([
            { $match: { order_status: { $ne: 'Cancelled' } } },
            { $group: { _id: null, totalSales: { $sum: '$total_amount' } } }
        ]);

        const totalSales = salesAgg.length > 0 ? parseFloat(salesAgg[0].totalSales) : 0;

        res.json({
            success: true,
            summary: {
                totalProducts,
                totalCustomers,
                totalOrders,
                totalSales
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, message: 'Error loading admin stats' });
    }
});

module.exports = router;
