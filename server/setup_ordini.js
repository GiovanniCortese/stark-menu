// server/setup_ordini.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: 5432,
});

const createOrdersTable = async () => {
  try {
    console.log("👨‍🍳 Preparazione registro ordini...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS ordini (
        id SERIAL PRIMARY KEY,
        ristorante_id INTEGER REFERENCES ristoranti(id),
        tavolo VARCHAR(10),
        dettagli TEXT, -- Qui salveremo la lista pizze come testo (es. "Margherita, Cola")
        prezzo_totale DECIMAL(10, 2),
        stato VARCHAR(20) DEFAULT 'in_attesa', -- in_attesa, completato
        data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log("✅ Tabella 'ordini' creata con successo!");

  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    pool.end();
  }
};

createOrdersTable();