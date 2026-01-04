// server/add_photo_column.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const updateDB = async () => {
  try {
    console.log("📸 Aggiunta colonna immagini...");
    // Aggiungiamo la colonna immagine_url se non esiste
    await pool.query(`
      ALTER TABLE prodotti 
      ADD COLUMN IF NOT EXISTS immagine_url TEXT;
    `);
    console.log("✅ Fatto! Il database ora supporta le foto.");
  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    pool.end();
  }
};

updateDB();