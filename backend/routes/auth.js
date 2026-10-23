const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Cart = require('../models/Cart');

// 1. User Registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        
        if (!name || !email || !password || !phone || !address) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }

        // Generate next auto-increment integer ID for backwards compatibility
        const lastUser = await User.findOne().sort({ user_id: -1 }).select('user_id');
        const nextUserId = (lastUser && lastUser.user_id) ? lastUser.user_id + 1 : 1;

        // Insert new customer user
        const newUser = await User.create({
            user_id: nextUserId,
            name: name.trim(),
            email: normalizedEmail,
            password: password,
            phone: phone.trim(),
            address: address.trim(),
            role: 'customer'
        });

        // Automatically create a cart for the new user
        const lastCart = await Cart.findOne().sort({ cart_id: -1 }).select('cart_id');
        const nextCartId = (lastCart && lastCart.cart_id) ? lastCart.cart_id + 1 : 1;

        await Cart.create({
            cart_id: nextCartId,
            user: newUser._id,
            user_id: newUser.user_id,
            items: []
        });

        res.json({ success: true, message: 'Registration successful! Please login.' });
    } catch (err) {
        console.error('Registration Error:', err);
        res.status(500).json({ success: false, message: 'Server error during registration' });
    }
});

// 2. User Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide email and password' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail, password: password });

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        req.session.user = {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
        };

        res.json({
            success: true,
            message: 'Login successful!',
            user: req.session.user
        });
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ success: false, message: 'Server error during login' });
    }
});

// 3. Logout
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// 4. Get Current Logged In User Info
router.get('/me', (req, res) => {
    if (req.session.user) {
        res.json({ loggedIn: true, user: req.session.user });
    } else {
        res.json({ loggedIn: false });
    }
});

module.exports = router;
