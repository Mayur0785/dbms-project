const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware: Admin check
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied' });
    }
    next();
};

// Admin Dashboard Summary Cards & DBMS Viva Queries
router.get('/dashboard', isAdmin, async (req, res) => {
    try {
        // Summary Counts
        const [[{ totalProducts }]] = await db.query('SELECT COUNT(*) AS totalProducts FROM products');
        const [[{ totalCustomers }]] = await db.query('SELECT COUNT(*) AS totalCustomers FROM users WHERE role = "customer"');
        const [[{ totalOrders }]] = await db.query('SELECT COUNT(*) AS totalOrders FROM orders');
        
        // DBMS Query: Calculate total sales (SUM)
        const [[{ totalSales }]] = await db.query('SELECT IFNULL(SUM(total_amount), 0) AS totalSales FROM orders WHERE order_status != "Cancelled"');

        res.json({
            success: true,
            summary: {
                totalProducts,
                totalCustomers,
                totalOrders,
                totalSales: parseFloat(totalSales)
            }
        });
    } catch (err) {
        console.error('Admin stats error:', err);
        res.status(500).json({ success: false, message: 'Error loading admin stats' });
    }
});

module.exports = router;
