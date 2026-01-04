// server/reset_ordini.js
require('dotenv').config();
const { Pool } = require('pg');

// Configurazione corretta per Neon
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Legge dal .env
  ssl: {
    rejectUnauthorized: false, // Necessario per Neon
  },
});

const resetOrders = async () => {
  try {
    console.log("🔥 Eliminazione vecchia tabella ordini su Neon...");
    await pool.query('DROP TABLE IF EXISTS ordini');
    
    console.log("🏗️ Ricreazione tabella...");
    await pool.query(`
      CREATE TABLE ordini (
        id SERIAL PRIMARY KEY,
        ristorante_id INTEGER,
        tavolo VARCHAR(10),
        dettagli TEXT,
        prezzo_totale DECIMAL(10, 2),
        stato VARCHAR(20) DEFAULT 'in_attesa',
        data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Tabella 'ordini' creata nel CLOUD!");

  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    pool.end();
  }
};

resetOrders();