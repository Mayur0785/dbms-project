const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function seedMySQL() {
    console.log('Connecting to MySQL to seed grocery_db...');
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'Mayur@07',
        multipleStatements: true
    });

    try {
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing database/schema.sql...');
        await connection.query(sql);

        console.log('MySQL grocery_db seeded successfully with all tables and sample data!');
        await connection.end();
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        await connection.end();
        process.exit(1);
    }
}

seedMySQL();
