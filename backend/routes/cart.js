const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please login to manage cart' });
    }
    next();
};

// Helper: Ensure user has a cart
async function getOrCreateCartId(userId) {
    const [carts] = await db.query('SELECT cart_id FROM cart WHERE user_id = ?', [userId]);
    if (carts.length > 0) {
        return carts[0].cart_id;
    }
    const [result] = await db.query('INSERT INTO cart (user_id) VALUES (?)', [userId]);
    return result.insertId;
}

// 1. Get Cart Items for current user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const cartId = await getOrCreateCartId(req.session.user.user_id);
        
        // JOIN cart_items with products table
        const [items] = await db.query(
            `SELECT ci.cart_item_id, ci.quantity, p.product_id, p.product_name, p.price, p.unit, p.stock, p.image,
                    (ci.quantity * p.price) AS subtotal
             FROM cart_items ci
             JOIN products p ON ci.product_id = p.product_id
             WHERE ci.cart_id = ?`,
            [cartId]
        );

        let grandTotal = 0;
        items.forEach(item => {
            grandTotal += Number(item.subtotal);
        });

        res.json({ success: true, cart_id: cartId, items, grandTotal });
    } catch (err) {
        console.error('Fetch cart error:', err);
        res.status(500).json({ success: false, message: 'Error fetching cart items' });
    }
});

// 2. Add product to cart
router.post('/add', isAuthenticated, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const qtyToAdd = parseInt(quantity) || 1;

        if (!product_id || qtyToAdd <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid product or quantity' });
        }

        // Check product stock
        const [products] = await db.query('SELECT stock, product_name FROM products WHERE product_id = ?', [product_id]);
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const product = products[0];

        const cartId = await getOrCreateCartId(req.session.user.user_id);

        // Check if item already in cart
        const [existing] = await db.query(
            'SELECT cart_item_id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [cartId, product_id]
        );

        let currentQtyInCart = existing.length > 0 ? existing[0].quantity : 0;
        let newTotalQty = currentQtyInCart + qtyToAdd;

        if (newTotalQty > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Cannot add. Stock limit reached! Only ${product.stock} available.`
            });
        }

        if (existing.length > 0) {
            // Update quantity
            await db.query('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?', [newTotalQty, existing[0].cart_item_id]);
        } else {
            // Insert item
            await db.query('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)', [cartId, product_id, qtyToAdd]);
        }

        res.json({ success: true, message: 'Product added to cart successfully!' });
    } catch (err) {
        console.error('Add to cart error:', err);
        res.status(500).json({ success: false, message: 'Error adding product to cart' });
    }
});

// 3. Update Item Quantity in Cart
router.put('/update/:cart_item_id', isAuthenticated, async (req, res) => {
    try {
        const { quantity } = req.body;
        const newQty = parseInt(quantity);

        if (isNaN(newQty) || newQty <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        // Check stock requirement
        const [items] = await db.query(
            `SELECT ci.cart_item_id, p.stock 
             FROM cart_items ci 
             JOIN products p ON ci.product_id = p.product_id 
             WHERE ci.cart_item_id = ?`,
            [req.params.cart_item_id]
        );

        if (items.length === 0) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        if (newQty > items[0].stock) {
            return res.status(400).json({ success: false, message: `Only ${items[0].stock} items in stock!` });
        }

        await db.query('UPDATE cart_items SET quantity = ? WHERE cart_item_id = ?', [newQty, req.params.cart_item_id]);

        res.json({ success: true, message: 'Cart quantity updated' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error updating cart item' });
    }
});

// 4. Remove Item from Cart
router.delete('/remove/:cart_item_id', isAuthenticated, async (req, res) => {
    try {
        await db.query('DELETE FROM cart_items WHERE cart_item_id = ?', [req.params.cart_item_id]);
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error removing item from cart' });
    }
});

// 5. Clear entire cart
router.delete('/clear', isAuthenticated, async (req, res) => {
    try {
        const cartId = await getOrCreateCartId(req.session.user.user_id);
        await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
        res.json({ success: true, message: 'Cart cleared' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error clearing cart' });
    }
});

module.exports = router;
