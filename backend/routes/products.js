const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Middleware to verify Admin role
const isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Admin rights required.' });
    }
    next();
};

// Helper: Format product document with category_name and consistent fields
function formatProduct(p) {
    const doc = p.toObject ? p.toObject() : p;
    const catName = (doc.category && doc.category.category_name) ? doc.category.category_name : '';
    const catId = (doc.category && doc.category.category_id) ? doc.category.category_id : doc.category_id;
    return {
        ...doc,
        category_name: catName,
        category_id: catId
    };
}

// --- CATEGORY ROUTES ---

// Get all categories (Public)
router.get('/categories', async (req, res) => {
    try {
        const categories = await Category.find().sort({ category_name: 1 });
        res.json({ success: true, categories });
    } catch (err) {
        console.error('Fetch categories error:', err);
        res.status(500).json({ success: false, message: 'Error fetching categories' });
    }
});

// Add new category (Admin)
router.post('/categories', isAdmin, async (req, res) => {
    try {
        const { category_name } = req.body;
        if (!category_name || !category_name.trim()) {
            return res.status(400).json({ success: false, message: 'Category name is required' });
        }

        const trimmed = category_name.trim();
        const existing = await Category.findOne({ category_name: trimmed });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Category already exists' });
        }

        const lastCat = await Category.findOne().sort({ category_id: -1 }).select('category_id');
        const nextCatId = (lastCat && lastCat.category_id) ? lastCat.category_id + 1 : 1;

        await Category.create({
            category_id: nextCatId,
            category_name: trimmed
        });

        res.json({ success: true, message: 'Category added successfully' });
    } catch (err) {
        console.error('Add category error:', err);
        res.status(500).json({ success: false, message: 'Error adding category' });
    }
});

// --- PRODUCT ROUTES ---

// Get all products along with category information (Supports Search & Filter)
router.get('/products', async (req, res) => {
    try {
        const { search, category_id } = req.query;
        const filter = {};

        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), 'i');
            filter.$or = [
                { product_name: regex },
                { description: regex }
            ];
        }

        if (category_id) {
            filter.category_id = Number(category_id);
        }

        const rawProducts = await Product.find(filter)
            .populate('category', 'category_id category_name')
            .sort({ product_id: 1 });

        const products = rawProducts.map(formatProduct);
        res.json({ success: true, products });
    } catch (err) {
        console.error('Fetch products error:', err);
        res.status(500).json({ success: false, message: 'Error fetching products' });
    }
});

// Get single product details
router.get('/products/:id', async (req, res) => {
    try {
        const idParam = req.params.id;
        const query = !isNaN(idParam) ? { product_id: Number(idParam) } : { _id: idParam };

        const product = await Product.findOne(query).populate('category', 'category_id category_name');
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, product: formatProduct(product) });
    } catch (err) {
        console.error('Fetch product error:', err);
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

        const priceNum = Number(price);
        const stockNum = Number(stock);

        if (priceNum < 0 || stockNum < 0) {
            return res.status(400).json({ success: false, message: 'Price and Stock cannot be negative' });
        }

        // Find Category document
        const catQuery = !isNaN(category_id) ? { category_id: Number(category_id) } : { _id: category_id };
        const categoryDoc = await Category.findOne(catQuery);
        if (!categoryDoc) {
            return res.status(400).json({ success: false, message: 'Selected category does not exist' });
        }

        const lastProd = await Product.findOne().sort({ product_id: -1 }).select('product_id');
        const nextProdId = (lastProd && lastProd.product_id) ? lastProd.product_id + 1 : 1;

        const imgPath = image && image.trim() ? image.trim() : '/images/products/default_product.png';

        await Product.create({
            product_id: nextProdId,
            category: categoryDoc._id,
            category_id: categoryDoc.category_id,
            product_name: product_name.trim(),
            description: (description || '').trim(),
            price: priceNum,
            stock: stockNum,
            unit: (unit || 'kg').trim(),
            image: imgPath
        });

        res.json({ success: true, message: 'Product added successfully' });
    } catch (err) {
        console.error('Add product error:', err);
        res.status(500).json({ success: false, message: 'Error adding product' });
    }
});

// Edit/Update Product (Admin)
router.put('/products/:id', isAdmin, async (req, res) => {
    try {
        const idParam = req.params.id;
        const { category_id, product_name, description, price, stock, unit, image } = req.body;

        const priceNum = Number(price);
        const stockNum = Number(stock);

        if (priceNum < 0 || stockNum < 0) {
            return res.status(400).json({ success: false, message: 'Price and Stock cannot be negative' });
        }

        const prodQuery = !isNaN(idParam) ? { product_id: Number(idParam) } : { _id: idParam };
        const product = await Product.findOne(prodQuery);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        if (category_id) {
            const catQuery = !isNaN(category_id) ? { category_id: Number(category_id) } : { _id: category_id };
            const categoryDoc = await Category.findOne(catQuery);
            if (categoryDoc) {
                product.category = categoryDoc._id;
                product.category_id = categoryDoc.category_id;
            }
        }

        if (product_name) product.product_name = product_name.trim();
        if (description !== undefined) product.description = description.trim();
        if (!isNaN(priceNum)) product.price = priceNum;
        if (!isNaN(stockNum)) product.stock = stockNum;
        if (unit) product.unit = unit.trim();
        if (image) product.image = image.trim();

        await product.save();
        res.json({ success: true, message: 'Product updated successfully' });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ success: false, message: 'Error updating product' });
    }
});

// Delete Product (Admin)
router.delete('/products/:id', isAdmin, async (req, res) => {
    try {
        const idParam = req.params.id;
        const prodQuery = !isNaN(idParam) ? { product_id: Number(idParam) } : { _id: idParam };
        const result = await Product.findOneAndDelete(prodQuery);

        if (!result) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete product error:', err);
        res.status(500).json({ success: false, message: 'Error deleting product' });
    }
});

module.exports = router;
