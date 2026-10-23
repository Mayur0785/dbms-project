const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');

// Middleware to ensure user is logged in
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Please login to manage cart' });
    }
    next();
};

// Helper: Ensure user has a cart
async function getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user_id: userId });
    if (!cart) {
        const userDoc = await User.findOne({ user_id: userId });
        const lastCart = await Cart.findOne().sort({ cart_id: -1 }).select('cart_id');
        const nextCartId = (lastCart && lastCart.cart_id) ? lastCart.cart_id + 1 : 1;

        cart = await Cart.create({
            cart_id: nextCartId,
            user: userDoc ? userDoc._id : null,
            user_id: userId,
            items: []
        });
    }
    return cart;
}

// 1. Get Cart Items for current user
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.session.user.user_id);
        await cart.populate('items.product');

        let grandTotal = 0;
        const items = [];

        for (const item of cart.items) {
            const p = item.product;
            if (!p) continue;

            const priceNum = Number(p.price) || 0;
            const subtotal = item.quantity * priceNum;
            grandTotal += subtotal;

            items.push({
                cart_item_id: item.cart_item_id || item._id,
                _id: item._id,
                quantity: item.quantity,
                product_id: p.product_id,
                product_name: p.product_name,
                price: priceNum,
                unit: p.unit,
                stock: p.stock,
                image: p.image,
                subtotal: subtotal
            });
        }

        res.json({
            success: true,
            cart_id: cart.cart_id,
            items,
            grandTotal
        });
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

        const prodQuery = !isNaN(product_id) ? { product_id: Number(product_id) } : { _id: product_id };
        const product = await Product.findOne(prodQuery);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const cart = await getOrCreateCart(req.session.user.user_id);
        const existingItem = cart.items.find(i => String(i.product) === String(product._id) || i.product_id === product.product_id);

        const currentQty = existingItem ? existingItem.quantity : 0;
        const newTotalQty = currentQty + qtyToAdd;

        if (newTotalQty > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Cannot add. Stock limit reached! Only ${product.stock} available.`
            });
        }

        if (existingItem) {
            existingItem.quantity = newTotalQty;
        } else {
            const nextItemId = Date.now() + Math.floor(Math.random() * 1000);
            cart.items.push({
                cart_item_id: nextItemId,
                product: product._id,
                product_id: product.product_id,
                quantity: qtyToAdd
            });
        }

        await cart.save();
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
        const itemIdParam = req.params.cart_item_id;

        if (isNaN(newQty) || newQty <= 0) {
            return res.status(400).json({ success: false, message: 'Quantity must be at least 1' });
        }

        const cart = await getOrCreateCart(req.session.user.user_id);
        const item = cart.items.find(i => String(i.cart_item_id) === String(itemIdParam) || String(i._id) === String(itemIdParam));

        if (!item) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        const product = await Product.findById(item.product);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product no longer exists' });
        }

        if (newQty > product.stock) {
            return res.status(400).json({ success: false, message: `Only ${product.stock} items in stock!` });
        }

        item.quantity = newQty;
        await cart.save();

        res.json({ success: true, message: 'Cart quantity updated' });
    } catch (err) {
        console.error('Update cart item error:', err);
        res.status(500).json({ success: false, message: 'Error updating cart item' });
    }
});

// 4. Remove Item from Cart
router.delete('/remove/:cart_item_id', isAuthenticated, async (req, res) => {
    try {
        const itemIdParam = req.params.cart_item_id;
        const cart = await getOrCreateCart(req.session.user.user_id);

        const initialLength = cart.items.length;
        cart.items = cart.items.filter(i => String(i.cart_item_id) !== String(itemIdParam) && String(i._id) !== String(itemIdParam));

        if (cart.items.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Cart item not found' });
        }

        await cart.save();
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (err) {
        console.error('Remove item error:', err);
        res.status(500).json({ success: false, message: 'Error removing item from cart' });
    }
});

// 5. Clear entire cart
router.delete('/clear', isAuthenticated, async (req, res) => {
    try {
        const cart = await getOrCreateCart(req.session.user.user_id);
        cart.items = [];
        await cart.save();
        res.json({ success: true, message: 'Cart cleared' });
    } catch (err) {
        console.error('Clear cart error:', err);
        res.status(500).json({ success: false, message: 'Error clearing cart' });
    }
});

module.exports = router;
