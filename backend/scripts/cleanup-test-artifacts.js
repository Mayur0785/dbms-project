const path = require('path');
const dns = require('dns');
const fs = require('fs');

// Configure reliable DNS servers for MongoDB Atlas SRV lookup
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const projectRoot = path.join(__dirname, '../..');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const User = require('../models/User');

async function runTargetedCleanup() {
    console.log('================================================================');
    console.log('       SAFE TARGETED CLEANUP OF CONFIRMED TEST ARTIFACTS        ');
    console.log('================================================================');

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI not found in backend/.env');
    }

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log(`[CONNECTED] MongoDB Atlas (${mongoose.connection.name})`);

    // -------------------------------------------------------------------------
    // 1. RE-CHECK AGAINST MYSQL BASELINE BACKUP (Safeguard 1)
    // -------------------------------------------------------------------------
    console.log('\n--- Safeguard 1 & 2: Pre-Condition & Identity Verification ---');
    const backupFile = path.join(projectRoot, 'database/backup_mysql_pre_migration.json');
    if (!fs.existsSync(backupFile)) {
        throw new Error('Baseline MySQL backup file not found at: ' + backupFile);
    }
    const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
    const mysqlOrderIds = backup.tables.orders.map(o => o.order_id);
    const mysqlPaymentIds = backup.tables.payments.map(p => p.payment_id);
    const mysqlAppleProduct = backup.tables.products.find(p => p.product_id === 1);

    if (mysqlOrderIds.includes(14)) {
        throw new Error('ABORT: order_id 14 unexpectedly exists in the original MySQL baseline backup!');
    }
    if (mysqlPaymentIds.includes(14)) {
        throw new Error('ABORT: payment_id 14 unexpectedly exists in the original MySQL baseline backup!');
    }
    console.log('[VERIFIED] Neither Order #14 nor Payment #14 exists in MySQL baseline backup.');

    // Find documents in MongoDB Atlas
    const order14 = await Order.findOne({ order_id: 14 });
    const payment14 = await Payment.findOne({ payment_id: 14 });

    if (!order14) {
        throw new Error('ABORT: Order #14 not found in MongoDB Atlas.');
    }
    if (!payment14) {
        throw new Error('ABORT: Payment #14 not found in MongoDB Atlas.');
    }

    // -------------------------------------------------------------------------
    // 2. VERIFY EXACT TEST DETAILS & LINKAGE (Safeguard 2)
    // -------------------------------------------------------------------------
    const isTestOrder = (
        order14.order_id === 14 &&
        order14.total_amount === 280 &&
        order14.delivery_address === 'H-12, Green Park, New Delhi' &&
        order14.items.length === 1 &&
        order14.items[0].product_id === 1 &&
        order14.items[0].quantity === 2 &&
        order14.items[0].price === 140
    );

    if (!isTestOrder) {
        throw new Error('ABORT: Order #14 does not match known test artifact details! Aborting for safety.');
    }

    const isTestPayment = (
        payment14.payment_id === 14 &&
        payment14.order_id === 14 &&
        payment14.order.toString() === order14._id.toString() &&
        payment14.payment_method === 'UPI' &&
        payment14.payment_status === 'Completed'
    );

    if (!isTestPayment) {
        throw new Error('ABORT: Payment #14 does not reference Order #14 correctly or details differ!');
    }
    console.log('[VERIFIED] Order #14 and Payment #14 confirmed as test artifacts from prior verification run.');

    // -------------------------------------------------------------------------
    // 3. VERIFY PRODUCT #1 STOCK (Safeguard 3 & 6)
    // -------------------------------------------------------------------------
    console.log('\n--- Safeguard 3 & 6: Product Stock Verification ---');
    const product1 = await Product.findOne({ product_id: 1 });
    if (!product1) {
        throw new Error('ABORT: Product #1 not found in MongoDB Atlas.');
    }

    console.log(`[INFO] Product #1 MySQL Baseline Stock: ${mysqlAppleProduct.stock}`);
    console.log(`[INFO] Product #1 MongoDB Current Stock: ${product1.stock}`);

    if (mysqlAppleProduct.stock !== 40) {
        throw new Error(`ABORT: Expected MySQL baseline stock for Product #1 to be 40, found: ${mysqlAppleProduct.stock}`);
    }
    if (product1.stock !== 38) {
        throw new Error(`ABORT: Expected current stock for Product #1 to be 38, found: ${product1.stock}. Stock may have changed!`);
    }
    console.log('[VERIFIED] Product #1 current stock is 38 (delta of -2 matches test Order #14 purchase).');

    // -------------------------------------------------------------------------
    // 4. CREATE PRE-CLEANUP BACKUP FILE (Safeguard 4)
    // -------------------------------------------------------------------------
    console.log('\n--- Safeguard 4: Creating Pre-Cleanup Document Export ---');
    const preCleanupBackup = {
        exportedAt: new Date().toISOString(),
        action: 'pre_cleanup_test_artifacts_backup',
        reason: 'Removing Order #14 and Payment #14 test artifacts; restoring Product #1 stock from 38 to 40',
        documents: {
            order14: order14.toObject(),
            payment14: payment14.toObject(),
            product1Before: product1.toObject()
        }
    };

    const cleanupBackupPath = path.join(projectRoot, 'database/cleanup_test_artifact_backup.json');
    fs.writeFileSync(cleanupBackupPath, JSON.stringify(preCleanupBackup, null, 2), 'utf8');
    console.log(`[BACKUP CREATED] Export saved to: ${cleanupBackupPath}`);

    // -------------------------------------------------------------------------
    // 5. ATOMIC EXECUTION VIA MONGOOSE TRANSACTION (Safeguard 5, 6 & 7)
    // -------------------------------------------------------------------------
    console.log('\n--- Safeguards 5, 6 & 7: Executing Atomic Cleanup Transaction ---');
    const session = await mongoose.startSession();
    try {
        session.startTransaction();

        // 1. Delete confirmed test Order #14
        const delOrderRes = await Order.deleteOne({ _id: order14._id, order_id: 14 }).session(session);
        if (delOrderRes.deletedCount !== 1) {
            throw new Error(`Expected to delete 1 order, deleted: ${delOrderRes.deletedCount}`);
        }

        // 2. Delete confirmed test Payment #14
        const delPaymentRes = await Payment.deleteOne({ _id: payment14._id, payment_id: 14 }).session(session);
        if (delPaymentRes.deletedCount !== 1) {
            throw new Error(`Expected to delete 1 payment, deleted: ${delPaymentRes.deletedCount}`);
        }

        // 3. Atomically restore Product #1 stock from 38 back to 40
        const updateProductRes = await Product.findOneAndUpdate(
            { product_id: 1, stock: 38 },
            { stock: 40 },
            { session, returnDocument: 'after' }
        );
        if (!updateProductRes || updateProductRes.stock !== 40) {
            throw new Error('Failed to atomically update Product #1 stock to 40');
        }

        await session.commitTransaction();
        console.log('[SUCCESS] Transaction committed successfully:');
        console.log(' - Deleted Order #14');
        console.log(' - Deleted Payment #14');
        console.log(' - Restored Product #1 stock: 38 -> 40');
    } catch (txnErr) {
        await session.abortTransaction();
        console.error('[ABORTED] Transaction aborted due to error:', txnErr.message);
        throw txnErr;
    } finally {
        await session.endSession();
    }

    // -------------------------------------------------------------------------
    // 6. POST-CLEANUP READ-ONLY RECONCILIATION VERIFICATION (Safeguard 9)
    // -------------------------------------------------------------------------
    console.log('\n--- Safeguard 9: Post-Cleanup Read-Only Reconciliation ---');
    const postOrdersCount = await Order.countDocuments();
    const postPaymentsCount = await Payment.countDocuments();
    const postProduct1 = await Product.findOne({ product_id: 1 });
    const allRemainingOrders = await Order.find().sort({ order_id: 1 }).populate('user', 'user_id');
    const allRemainingPayments = await Payment.find().sort({ payment_id: 1 }).populate('order', 'order_id');

    console.log(`[CHECK] Total Orders in MongoDB: ${postOrdersCount} (Target: 12)`);
    console.log(`[CHECK] Total Payments in MongoDB: ${postPaymentsCount} (Target: 12)`);
    console.log(`[CHECK] Product #1 Final Stock: ${postProduct1.stock} (Target: 40)`);

    const expectedIds = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 12, 13];
    const actualOrderIds = allRemainingOrders.map(o => o.order_id);
    const actualPaymentIds = allRemainingPayments.map(p => p.payment_id);

    const orderIdsMatch = JSON.stringify(actualOrderIds) === JSON.stringify(expectedIds);
    const paymentIdsMatch = JSON.stringify(actualPaymentIds) === JSON.stringify(expectedIds);

    console.log(`[CHECK] Order IDs match MySQL baseline exactly: ${orderIdsMatch}`);
    console.log(`[CHECK] Payment IDs match MySQL baseline exactly: ${paymentIdsMatch}`);

    // Referential integrity check
    let referentialIntegrityValid = true;
    for (const o of allRemainingOrders) {
        if (!o.user || o.user.user_id !== o.user_id) referentialIntegrityValid = false;
    }
    for (const p of allRemainingPayments) {
        if (!p.order || p.order.order_id !== p.order_id) referentialIntegrityValid = false;
    }
    console.log(`[CHECK] All remaining document references valid: ${referentialIntegrityValid}`);

    const allChecksPass = (
        postOrdersCount === 12 &&
        postPaymentsCount === 12 &&
        postProduct1.stock === 40 &&
        orderIdsMatch &&
        paymentIdsMatch &&
        referentialIntegrityValid
    );

    if (allChecksPass) {
        console.log('\n================================================================');
        console.log('  RECONCILIATION COMPLETE: EXACT 100% PARITY RESTORED WITH MYSQL ');
        console.log('================================================================\n');
    } else {
        throw new Error('Post-cleanup verification failed one or more assertions!');
    }

    await mongoose.disconnect();
}

runTargetedCleanup().catch(err => {
    console.error('[FATAL] Cleanup script halted:', err.message);
    process.exit(1);
});
