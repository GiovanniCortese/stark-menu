const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE: Manca DATABASE_URL nel file .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

module.exports = pool;