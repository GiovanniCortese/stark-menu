// server/update_db.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const update = async () => {
  try {
    console.log("🛠️ Aggiungo la colonna 'ordini_abilitati'...");
    
    // Aggiunge la colonna e la imposta a TRUE di default per tutti
    await pool.query(`
      ALTER TABLE ristoranti 
      ADD COLUMN IF NOT EXISTS ordini_abilitati BOOLEAN DEFAULT TRUE;
    `);
    
    console.log("✅ Fatto! Ora i ristoranti hanno l'interruttore.");
  } catch (err) {
    console.error("Errore:", err);
  } finally {
    pool.end();
  }
};

update();