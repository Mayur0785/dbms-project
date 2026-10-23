/**
 * MongoDB Atlas Authentication & Ping Test
 * Secure verification that tests Mongoose connectivity and executes a harmless ping command.
 * Strictly sanitizes output to ensure no passwords or credentials are ever exposed.
 */
const path = require('path');
const dns = require('dns');
const dotenv = require('dotenv');

// Configure reliable DNS resolvers to support SRV resolution on Windows
try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (_) {}

// Load .env specifically from backend/.env (or fallback to root .env)
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

// Security sanitizer: remove any passwords or query tokens from error strings
function sanitizeError(msg) {
    if (!msg) return 'Unknown error';
    return String(msg)
        .replace(/mongodb(\+srv)?:\/\/[^@]+@/gi, 'mongodb+srv://<credentials-hidden>@')
        .replace(/:([^\s@:]+)@/g, ':<password-hidden>@');
}

async function runMongoPingTest() {
    console.log('====================================================');
    console.log('MongoDB Atlas Authentication & Ping Verification');
    console.log('====================================================');

    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('[ERROR] MONGODB_URI is not set in backend/.env');
        process.exit(1);
    }

    // Extract cluster host safely
    const hostMatch = uri.match(/@([^/?#]+)/);
    const clusterHost = hostMatch ? hostMatch[1] : 'Atlas Cluster';
    console.log(`[INFO] Target Cluster: ${clusterHost}`);
    console.log('[INFO] Initiating connection via Mongoose...');

    let mongoose;
    try {
        mongoose = require('mongoose');
    } catch (e) {
        console.error('[ERROR] Mongoose module not found. Please install mongoose.');
        process.exit(1);
    }

    try {
        // Connect to MongoDB Atlas
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 10000
        });

        console.log('[SUCCESS] Successfully connected and authenticated to MongoDB Atlas!');
        console.log(`[INFO] Active Database: ${mongoose.connection.name}`);

        // Execute harmless ping command
        console.log('[INFO] Executing database ping command...');
        const pingResult = await mongoose.connection.db.admin().ping();

        console.log('[SUCCESS] Database ping response received:', JSON.stringify(pingResult));
        console.log('[SUCCESS] MongoDB Atlas credentials and permissions verified successfully!');

        // Safely close connection
        await mongoose.disconnect();
        console.log('[INFO] Connection closed cleanly.');
        console.log('====================================================');
        process.exit(0);
    } catch (err) {
        console.error('[ERROR] MongoDB connection/authentication failed:');
        console.error(sanitizeError(err.message || err));
        console.log('====================================================');
        process.exit(1);
    }
}

runMongoPingTest();
