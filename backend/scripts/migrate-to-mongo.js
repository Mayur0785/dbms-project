/**
 * Resumable MySQL Baseline Snapshot to MongoDB Atlas Seeding/Migration Script
 * Reads verified baseline data snapshot and populates MongoDB Atlas while preserving
 * full referential integrity, ObjectIds, and historical data.
 */
const path = require('path');
const dns = require('dns');
const fs = require('fs');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Set reliable DNS servers for Atlas SRV lookup
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

// Load environment variables from backend/.env
const envPaths = [
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), 'backend/.env'),
    path.join(process.cwd(), '.env')
];
for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        if (process.env.MONGODB_URI) break;
    }
}

const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

async function runMigration() {
    console.log('====================================================');
    console.log('Starting Baseline Data -> MongoDB Atlas Seeding');
    console.log('====================================================');

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI not found in backend/.env');
    }

    const backupFile = path.join(__dirname, '../../database/backup_mysql_pre_migration.json');
    if (!fs.existsSync(backupFile)) {
        throw new Error('Baseline data file not found at: ' + backupFile);
    }
    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('[SUCCESS] Connected to MongoDB Atlas (' + mongoose.connection.name + ')');

    // ID Mapping dictionaries: Legacy integer ID -> MongoDB ObjectId
    const userIdMap = new Map();
    const categoryIdMap = new Map();
    const productIdMap = new Map();
    const orderIdMap = new Map();

    const report = {
        users: { source: 0, migrated: 0, skipped: 0 },
        categories: { source: 0, migrated: 0, skipped: 0 },
        products: { source: 0, migrated: 0, skipped: 0 },
        cart: { source: 0, migrated: 0, skipped: 0 },
        orders: { source: 0, migrated: 0, skipped: 0 },
        payments: { source: 0, migrated: 0, skipped: 0 }
    };

    // 1. Migrate Users
    console.log('\n--- 1. Migrating Users ---');
    const mysqlUsers = backupData.tables.users || [];
    report.users.source = mysqlUsers.length;

    for (const u of mysqlUsers) {
        let existing = await User.findOne({ email: u.email.toLowerCase() });
        if (!existing) {
            existing = await User.create({
                user_id: u.user_id,
                name: u.name,
                email: u.email.toLowerCase(),
                password: u.password,
                phone: u.phone,
                address: u.address,
                role: u.role,
                created_at: u.created_at || new Date()
            });
            report.users.migrated++;
        } else {
            report.users.skipped++;
        }
        userIdMap.set(u.user_id, existing._id);
    }
    console.log(`Users: ${report.users.migrated} migrated, ${report.users.skipped} already existing.`);

    // 2. Migrate Categories
    console.log('\n--- 2. Migrating Categories ---');
    const mysqlCategories = backupData.tables.categories || [];
    report.categories.source = mysqlCategories.length;

    for (const c of mysqlCategories) {
        let existing = await Category.findOne({ category_name: c.category_name });
        if (!existing) {
            existing = await Category.create({
                category_id: c.category_id,
                category_name: c.category_name
            });
            report.categories.migrated++;
        } else {
            report.categories.skipped++;
        }
        categoryIdMap.set(c.category_id, existing._id);
    }
    console.log(`Categories: ${report.categories.migrated} migrated, ${report.categories.skipped} already existing.`);

    // 3. Migrate Products
    console.log('\n--- 3. Migrating Products ---');
    const mysqlProducts = backupData.tables.products || [];
    report.products.source = mysqlProducts.length;

    for (const p of mysqlProducts) {
        const categoryObjectId = categoryIdMap.get(p.category_id);
        if (!categoryObjectId) {
            throw new Error(`Integrity error: Product ${p.product_id} has invalid category_id ${p.category_id}`);
        }

        let existing = await Product.findOne({ product_id: p.product_id });
        if (!existing) {
            existing = await Product.create({
                product_id: p.product_id,
                category: categoryObjectId,
                category_id: p.category_id,
                product_name: p.product_name,
                description: p.description || '',
                price: Number(p.price),
                stock: Number(p.stock),
                unit: p.unit || 'kg',
                image: p.image || '/images/products/default_product.png'
            });
            report.products.migrated++;
        } else {
            report.products.skipped++;
        }
        productIdMap.set(p.product_id, existing._id);
    }
    console.log(`Products: ${report.products.migrated} migrated, ${report.products.skipped} already existing.`);

    // 4. Migrate Cart & Cart Items
    console.log('\n--- 4. Migrating Carts & Items ---');
    const mysqlCarts = backupData.tables.cart || [];
    const allCartItems = backupData.tables.cart_items || [];
    report.cart.source = mysqlCarts.length;

    for (const c of mysqlCarts) {
        const userObjectId = userIdMap.get(c.user_id);
        if (!userObjectId) continue;

        const cartItemsForCart = allCartItems.filter(ci => ci.cart_id === c.cart_id);
        const items = [];
        for (const ci of cartItemsForCart) {
            const productObjectId = productIdMap.get(ci.product_id);
            if (productObjectId) {
                items.push({
                    cart_item_id: ci.cart_item_id,
                    product: productObjectId,
                    product_id: ci.product_id,
                    quantity: Number(ci.quantity)
                });
            }
        }

        let existing = await Cart.findOne({ user: userObjectId });
        if (!existing) {
            existing = await Cart.create({
                cart_id: c.cart_id,
                user: userObjectId,
                user_id: c.user_id,
                items: items,
                created_at: c.created_at || new Date()
            });
            report.cart.migrated++;
        } else {
            report.cart.skipped++;
        }
    }
    console.log(`Carts: ${report.cart.migrated} migrated, ${report.cart.skipped} already existing.`);

    // 5. Migrate Orders & Order Items
    console.log('\n--- 5. Migrating Orders & Order Items ---');
    const mysqlOrders = backupData.tables.orders || [];
    const allOrderItems = backupData.tables.order_items || [];
    report.orders.source = mysqlOrders.length;

    const prodMetaMap = new Map();
    mysqlProducts.forEach(p => prodMetaMap.set(p.product_id, p));

    for (const o of mysqlOrders) {
        const userObjectId = userIdMap.get(o.user_id);
        if (!userObjectId) {
            throw new Error(`Integrity error: Order ${o.order_id} has invalid user_id ${o.user_id}`);
        }

        const itemsForOrder = allOrderItems.filter(oi => oi.order_id === o.order_id);
        const items = [];
        for (const oi of itemsForOrder) {
            const productObjectId = productIdMap.get(oi.product_id);
            const pMeta = prodMetaMap.get(oi.product_id) || {};
            items.push({
                order_item_id: oi.order_item_id,
                product: productObjectId,
                product_id: oi.product_id,
                product_name: pMeta.product_name || `Product #${oi.product_id}`,
                unit: pMeta.unit || 'kg',
                image: pMeta.image || '/images/products/default_product.png',
                quantity: Number(oi.quantity),
                price: Number(oi.price)
            });
        }

        let existing = await Order.findOne({ order_id: o.order_id });
        if (!existing) {
            existing = await Order.create({
                order_id: o.order_id,
                user: userObjectId,
                user_id: o.user_id,
                order_date: o.order_date || new Date(),
                total_amount: Number(o.total_amount),
                delivery_address: o.delivery_address,
                order_status: o.order_status || 'Pending',
                items: items
            });
            report.orders.migrated++;
        } else {
            report.orders.skipped++;
        }
        orderIdMap.set(o.order_id, existing._id);
    }
    console.log(`Orders: ${report.orders.migrated} migrated, ${report.orders.skipped} already existing.`);

    // 6. Migrate Payments
    console.log('\n--- 6. Migrating Payments ---');
    const mysqlPayments = backupData.tables.payments || [];
    report.payments.source = mysqlPayments.length;

    for (const p of mysqlPayments) {
        const orderObjectId = orderIdMap.get(p.order_id);
        if (!orderObjectId) {
            throw new Error(`Integrity error: Payment ${p.payment_id} has invalid order_id ${p.order_id}`);
        }

        let existing = await Payment.findOne({ order_id: p.order_id });
        if (!existing) {
            existing = await Payment.create({
                payment_id: p.payment_id,
                order: orderObjectId,
                order_id: p.order_id,
                payment_method: p.payment_method,
                payment_status: p.payment_status || 'Pending',
                payment_date: p.payment_date || new Date()
            });
            report.payments.migrated++;
        } else {
            report.payments.skipped++;
        }
    }
    console.log(`Payments: ${report.payments.migrated} migrated, ${report.payments.skipped} already existing.`);

    console.log('\n====================================================');
    console.log('MIGRATION SUMMARY');
    console.log('====================================================');
    console.table(report);

    // Verify destination collections
    const destCounts = {
        users: await User.countDocuments(),
        categories: await Category.countDocuments(),
        products: await Product.countDocuments(),
        carts: await Cart.countDocuments(),
        orders: await Order.countDocuments(),
        payments: await Payment.countDocuments()
    };
    console.log('\nMongoDB Atlas Destination Collection Counts:');
    console.log(destCounts);

    await mongoose.disconnect();
    console.log('[SUCCESS] Migration routine completed cleanly.');
    process.exit(0);
}

runMigration().catch(err => {
    console.error('\n[FATAL ERROR] Migration failed:', err);
    process.exit(1);
});
