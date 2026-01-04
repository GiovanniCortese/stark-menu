require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const updateDB = async () => {
  try {
    console.log("📸 Tentativo creazione colonna immagini...");
    await pool.query(`
      ALTER TABLE prodotti 
      ADD COLUMN IF NOT EXISTS immagine_url TEXT;
    `);
    console.log("✅ SUCCESSO: La colonna 'immagine_url' è presente!");
  } catch (err) {
    console.error("❌ ERRORE DATABASE:", err);
  } finally {
    pool.end();
  }
};

updateDB();