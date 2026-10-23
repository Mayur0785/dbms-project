const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

const envPaths = [
    path.join(__dirname, '.env'),
    path.join(process.cwd(), 'backend/.env'),
    path.join(process.cwd(), '.env')
];
for (const envPath of envPaths) {
    dotenv.config({ path: envPath });
    if (process.env.MONGODB_URI) break;
}

const User = require('./models/User');
const Category = require('./models/Category');
const Product = require('./models/Product');
const Cart = require('./models/Cart');

async function seedMongoDB() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('MONGODB_URI not found in backend/.env');
        process.exit(1);
    }

    console.log('Connecting to MongoDB Atlas to seed sample data...');
    await mongoose.connect(uri);

    const userCount = await User.countDocuments();
    if (userCount > 0) {
        console.log(`Database already has ${userCount} users. Skipping destructive re-seed.`);
        await mongoose.disconnect();
        process.exit(0);
    }

    console.log('Seeding initial categories, admin, and demo users...');
    // Demo categories
    const categoriesData = [
        { category_id: 1, category_name: 'Fruits & Vegetables' },
        { category_id: 2, category_name: 'Dairy' },
        { category_id: 3, category_name: 'Bakery' },
        { category_id: 4, category_name: 'Snacks' },
        { category_id: 5, category_name: 'Beverages' },
        { category_id: 6, category_name: 'Rice & Grains' },
        { category_id: 7, category_name: 'Household' }
    ];
    for (const c of categoriesData) {
        await Category.findOneAndUpdate({ category_name: c.category_name }, c, { upsert: true });
    }

    // Demo admin & customer
    await User.findOneAndUpdate(
        { email: 'admin@grocery.com' },
        {
            user_id: 1,
            name: 'System Admin',
            email: 'admin@grocery.com',
            password: 'admin123',
            phone: '9876543210',
            address: 'Head Office, New Delhi',
            role: 'admin'
        },
        { upsert: true }
    );

    const customer = await User.findOneAndUpdate(
        { email: 'rahul@gmail.com' },
        {
            user_id: 2,
            name: 'Rahul Sharma',
            email: 'rahul@gmail.com',
            password: 'user123',
            phone: '9811122233',
            address: 'H-12, Green Park, New Delhi',
            role: 'customer'
        },
        { upsert: true, new: true }
    );

    await Cart.findOneAndUpdate(
        { user: customer._id },
        { cart_id: 1, user: customer._id, user_id: customer.user_id, items: [] },
        { upsert: true }
    );

    console.log('MongoDB Atlas seeded successfully!');
    await mongoose.disconnect();
    process.exit(0);
}

seedMongoDB().catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
});
