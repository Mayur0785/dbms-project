const mysql = require('mysql2');

// Create MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'Mayur@07',
    database: process.env.DB_NAME || 'grocery_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export promise-based pool for clean async/await usage
module.exports = pool.promise();
