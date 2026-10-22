const express = require('express');
const router = express.Router();
const db = require('../db');

// Middleware to verify Admin role
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }
    next();
};

// --- CATEGORY ROUTES ---

// Get all categories (Public)
router.get('/categories', async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY category_name ASC');
        res.json({ success: true, categories });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

// Add new category (Admin)
router.post('/categories', isAdmin, async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }
        await db.query('INSERT INTO categories (category_name) VALUES (?)', [category_name]);
        res.json({ success: true, message: 'Category added successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error adding category (may already exist)' });
    }
});

// --- PRODUCT ROUTES ---

// DBMS Query 1: Get all products along with their category names (Supports Search & Filter)
router.get('/products', async (req, res) => {
    try {
        const { search, category_id } = req.query;
        let query = `
            SELECT p.*, c.category_name 
            FROM products p 
            JOIN categories c ON p.category_id = c.category_id 
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            query += ` AND (p.product_name LIKE ? OR p.description LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (category_id) {
            query += ` AND p.category_id = ?`;
            params.push(category_id);
        }

        query += ` ORDER BY p.product_id ASC`;

        const [products] = await db.query(query, params);
        res.json({ success: true, products });
    } catch (err) {
        console.error('Fetch products error:', err);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Get single product details
router.get('/products/:id', async (req, res) => {
    try {
        const [products] = await db.query(
            `SELECT p.*, c.category_name 
             FROM products p 
             JOIN categories c ON p.category_id = c.category_id 
             WHERE p.product_id = ?`,
            [req.params.id]
        );
        if (products.length === 0) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, product: products[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error fetching product' });
    }
});

// Add new product (Admin)
router.post('/products', isAdmin, async (req, res) => {
    try {
        const { category_id, product_name, description, price, stock, unit, image } = req.body;
        
        if (!category_id || !product_name || price == null || stock == null) {
            return res.status(400).json({ success: false, message: 'Missing required product fields' });
        }

        if (price < 0 || stock < 0) {
            return res.status(400).json({ success: false, message: 'Price and Stock cannot be negative' });
        }

        const imgPath = image && image.trim() ? image.trim() : '/images/products/default_product.png';

        await db.query(
            `INSERT INTO products (category_id, product_name, description, price, stock, unit, image)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [category_id, product_name, description || '', price, stock, unit || 'kg', imgPath]
        );

        res.json({ success: true, message: 'Product added successfully' });
    } catch (err) {
        console.error('Add product error:', err);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

// Edit/Update Product (Admin)
router.put('/products/:id', isAdmin, async (req, res) => {
    try {
        const { category_id, product_name, description, price, stock, unit, image } = req.body;

        if (price < 0 || stock < 0) {
            return res.status(400).json({ success: false, message: 'Price and Stock cannot be negative' });
        }

        const imgPath = image && image.trim() ? image.trim() : '/images/products/default_product.png';

        await db.query(
            `UPDATE products 
             SET category_id = ?, product_name = ?, description = ?, price = ?, stock = ?, unit = ?, image = ?
             WHERE product_id = ?`,
            [category_id, product_name, description, price, stock, unit, imgPath, req.params.id]
        );

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

// Delete Product (Admin)
router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM products WHERE product_id = ?', [req.params.id]);
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

module.exports = router;
