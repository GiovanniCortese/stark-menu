// server/fix_db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const fixSchema = async () => {
  try {
    console.log("🔧 Applicazione fix alla tabella Prodotti...");

    // Aggiungiamo la colonna 'categoria'
    await pool.query(`
      ALTER TABLE prodotti 
      ADD COLUMN IF NOT EXISTS categoria VARCHAR(50);
    `);
    
    console.log("✅ Colonna 'categoria' aggiunta correttamente alla tabella 'prodotti'.");

  } catch (err) {
    console.error("❌ Errore:", err.message);
  } finally {
    pool.end();
  }
};

fixSchema();