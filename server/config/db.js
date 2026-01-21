const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE: Manca DATABASE_URL nel file .env");
    process.exit(1);
}

// Determina se serve l'SSL.
// Su Render, la connessione interna (host finisce per .internal) NON vuole SSL.
// La connessione esterna (o Neon) LO vuole.
const isRenderInternal = process.env.DATABASE_URL.includes('render.internal');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isRenderInternal ? false : { rejectUnauthorized: false }
});

module.exports = pool;