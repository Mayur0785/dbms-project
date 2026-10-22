const express = require('express');
const router = express.Router();
const db = require('../db');

// 1. User Registration
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, phone, address } = req.body;
        
        if (!name || !email || !password || !phone || !address) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Check if user already exists
        const [existing] = await db.query('SELECT user_id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }

        // Insert new customer user
        const [result] = await db.query(
            'INSERT INTO users (name, email, password, phone, address, role) VALUES (?, ?, ?, ?, ?, "customer")',
            [name, email, password, phone, address]
        );

        // Automatically create a cart for the new user
        await db.query('INSERT INTO cart (user_id) VALUES (?)', [result.insertId]);

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

        const [users] = await db.query('SELECT * FROM users WHERE email = ? AND password = ?', [email, password]);

        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const user = users[0];
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
