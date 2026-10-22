const express = require('express');
const router = express.Router();
const db = require('../db');

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

// 1. Place an Order (Transaction based: Cart -> Order & Items -> Payment & Stock reduction)
router.post('/place', isCustomer, async (req, res) => {
    const userId = req.session.user.user_id;
    const { delivery_address, payment_method } = req.body;

    if (!delivery_address || !payment_method) {
        return res.status(400).json({ success: false, message: 'Delivery address and Payment method are required' });
    }

    const validPaymentMethods = ['Cash on Delivery', 'UPI'];
    if (!validPaymentMethods.includes(payment_method)) {
        return res.status(400).json({ success: false, message: 'Invalid payment method' });
    }

    try {
        // Get user cart
        const [carts] = await db.query('SELECT cart_id FROM cart WHERE user_id = ?', [userId]);
        if (carts.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty' });
        }

        const cartId = carts[0].cart_id;

        // Get cart items with product info using SQL JOIN
        const [cartItems] = await db.query(
            `SELECT ci.product_id, ci.quantity, p.price, p.stock, p.product_name 
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.product_id
             WHERE ci.cart_id = ?`,
            [cartId]
        );

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty. Add products before checkout.' });
        }

        // Validate stock for all items first
        for (const item of cartItems) {
            if (item.quantity > item.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.product_name}. Available: ${item.stock}`
                });
            }
        }

        // Calculate total amount
        let totalAmount = 0;
        cartItems.forEach(item => {
            totalAmount += Number(item.price) * item.quantity;
        });

        // Step A: Insert Order
        const [orderResult] = await db.query(
            `INSERT INTO orders (user_id, total_amount, delivery_address, order_status)
             VALUES (?, ?, ?, 'Pending')`,
            [userId, totalAmount, delivery_address]
        );

        const orderId = orderResult.insertId;

        // Step B: Insert Order Items & Update Stock
        for (const item of cartItems) {
            await db.query(
                `INSERT INTO order_items (order_id, product_id, quantity, price)
                 VALUES (?, ?, ?, ?)`,
                [orderId, item.product_id, item.quantity, item.price]
            );

            // Decrease product stock
            await db.query(
                `UPDATE products SET stock = stock - ? WHERE product_id = ?`,
                [item.quantity, item.product_id]
            );
        }

        // Step C: Record Payment
        const paymentStatus = payment_method === 'UPI' ? 'Completed' : 'Pending';
        await db.query(
            `INSERT INTO payments (order_id, payment_method, payment_status)
             VALUES (?, ?, ?)`,
            [orderId, payment_method, paymentStatus]
        );

        // Step D: Empty Customer Cart
        await db.query(`DELETE FROM cart_items WHERE cart_id = ?`, [cartId]);

        res.json({
            success: true,
            message: 'Order placed successfully!',
            order_id: orderId
        });
    } catch (err) {
        console.error('Place order error:', err);
        res.status(500).json({ success: false, message: 'Failed to process order. Please try again.' });
    }
});

// 2. Display all orders placed by particular customer (current logged in customer)
router.get('/my-orders', isCustomer, async (req, res) => {
    try {
        const userId = req.session.user.user_id;

        // JOIN orders with payments
        const [orders] = await db.query(
            `SELECT o.order_id, o.user_id, o.order_date, o.total_amount, o.delivery_address, o.order_status,
                    p.payment_id, p.payment_method, p.payment_status, p.payment_date 
             FROM orders o 
             LEFT JOIN payments p ON o.order_id = p.order_id 
             WHERE o.user_id = ? 
             ORDER BY o.order_date DESC`,
            [userId]
        );

        // Fetch items for each order using SQL JOIN
        for (const order of orders) {
            const [items] = await db.query(
                `SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.price,
                        (oi.quantity * oi.price) AS subtotal,
                        pr.product_name, pr.unit, pr.image 
                 FROM order_items oi 
                 JOIN products pr ON oi.product_id = pr.product_id 
                 WHERE oi.order_id = ?`,
                [order.order_id]
            );
            order.items = items;
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
        const [orders] = await db.query(
            `SELECT o.order_id, o.user_id, o.order_date, o.total_amount, o.delivery_address, o.order_status,
                    u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                    p.payment_id, p.payment_method, p.payment_status, p.payment_date
             FROM orders o
             JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments p ON o.order_id = p.order_id
             ORDER BY o.order_date DESC`
        );

        for (const order of orders) {
            const [items] = await db.query(
                `SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.price,
                        (oi.quantity * oi.price) AS subtotal,
                        pr.product_name, pr.unit, pr.image 
                 FROM order_items oi 
                 JOIN products pr ON oi.product_id = pr.product_id 
                 WHERE oi.order_id = ?`,
                [order.order_id]
            );
            order.items = items;
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
        const orderId = req.params.order_id;
        const [orders] = await db.query(
            `SELECT o.order_id, o.user_id, o.order_date, o.total_amount, o.delivery_address, o.order_status,
                    u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone,
                    p.payment_id, p.payment_method, p.payment_status, p.payment_date
             FROM orders o
             JOIN users u ON o.user_id = u.user_id
             LEFT JOIN payments p ON o.order_id = p.order_id
             WHERE o.order_id = ?`,
            [orderId]
        );

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const order = orders[0];
        const [items] = await db.query(
            `SELECT oi.order_item_id, oi.order_id, oi.product_id, oi.quantity, oi.price,
                    (oi.quantity * oi.price) AS subtotal,
                    pr.product_name, pr.unit, pr.image 
             FROM order_items oi 
             JOIN products pr ON oi.product_id = pr.product_id 
             WHERE oi.order_id = ?`,
            [orderId]
        );
        order.items = items;

        res.json({ success: true, order });
    } catch (err) {
        console.error('Admin single order error:', err);
        res.status(500).json({ success: false, message: 'Error fetching order details' });
    }
});

// 5. Admin: Update order status
router.put('/admin/status/:order_id', isAdmin, async (req, res) => {
    try {
        const { order_status } = req.body;
        const validStatuses = ['Pending', 'Confirmed', 'Delivered', 'Cancelled'];
        
        if (!validStatuses.includes(order_status)) {
            return res.status(400).json({ success: false, message: 'Invalid order status' });
        }

        await db.query('UPDATE orders SET order_status = ? WHERE order_id = ?', [order_status, req.params.order_id]);

        // If order delivered, mark payment completed
        if (order_status === 'Delivered') {
            await db.query('UPDATE payments SET payment_status = "Completed" WHERE order_id = ?', [req.params.order_id]);
        }

        res.json({ success: true, message: `Order #${req.params.order_id} status updated to ${order_status}` });
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ success: false, message: 'Error updating order status' });
    }
});

module.exports = router;
