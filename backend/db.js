const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

// Configure reliable DNS servers for MongoDB Atlas SRV lookup
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

// Load environment variables from backend/.env or root .env
const envPaths = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
    path.join(process.cwd(), 'backend/.env'),
    path.join(process.cwd(), '.env')
];
for (const envPath of envPaths) {
    dotenv.config({ path: envPath });
    if (process.env.MONGODB_URI) break;
}

// MongoDB Atlas Connection
async function connectDB() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error('MONGODB_URI environment variable is not defined in backend/.env');
        }
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 15000
        });
        console.log(`[MongoDB Connected Successfully: ${mongoose.connection.name}]`);
        return mongoose.connection;
    } catch (err) {
        console.error('[MongoDB Connection Error]:', err.message);
        throw err;
    }
}

module.exports = {
    connectDB,
    mongoose
};
