// server/seed.js - VERSIONE MULTI-RISTORANTE
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const seed = async () => {
  try {
    // 1. Pulizia Totale (Tabula Rasa)
    console.log("🧹 Pulizia database...");
    await pool.query('DROP TABLE IF EXISTS ordini');
    await pool.query('DROP TABLE IF EXISTS prodotti');
    await pool.query('DROP TABLE IF EXISTS ristoranti');

    // 2. Creazione Tabelle
    console.log("🏗️ Creazione tabelle...");
    await pool.query(`
      CREATE TABLE ristoranti (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        slug VARCHAR(100) UNIQUE,
        email_titolare VARCHAR(100),
        password VARCHAR(100)
      );
    `);

    await pool.query(`
      CREATE TABLE prodotti (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100),
        prezzo DECIMAL(5,2),
        categoria VARCHAR(50),
        immagine_url TEXT,
        ristorante_id INTEGER REFERENCES ristoranti(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE ordini (
        id SERIAL PRIMARY KEY,
        ristorante_id INTEGER REFERENCES ristoranti(id),
        tavolo VARCHAR(50),
        dettagli TEXT,
        prezzo_totale DECIMAL(6,2),
        stato VARCHAR(20) DEFAULT 'in_attesa',
        data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Inserimento Ristoranti (STARK + LUIGI)
    console.log("👨‍🍳 Inserimento Ristoranti...");
    
    // Ristorante 1: Stark
    const res1 = await pool.query(`
      INSERT INTO ristoranti (nome, slug, email_titolare, password) 
      VALUES ('Pizzeria Stark', 'pizzeria-stark', 'tony@stark.it', 'admin123') 
      RETURNING id
    `);
    const idStark = res1.rows[0].id;

    // Ristorante 2: Da Luigi (NUOVO!)
    const res2 = await pool.query(`
      INSERT INTO ristoranti (nome, slug, email_titolare, password) 
      VALUES ('Pizzeria Da Luigi', 'da-luigi', 'luigi@mario.it', 'luigi123') 
      RETURNING id
    `);
    const idLuigi = res2.rows[0].id;

    // 4. Inserimento Prodotti
    console.log("🍕 Inserimento Pizze...");

    // Menu Stark (High Tech)
    await pool.query(`
      INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id) VALUES 
      ('Pizza Arc Reattore', 15.00, 'Pizze', $1),
      ('Burger Jarvis', 12.50, 'Pizze', $1),
      ('Vino di Asgard', 40.00, 'Bibite', $1)
    `, [idStark]);

    // Menu Luigi (Classico)
    await pool.query(`
      INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id) VALUES 
      ('Pizza Margherita', 6.00, 'Pizze', $1),
      ('Pizza Diavola', 7.50, 'Pizze', $1),
      ('Coca Cola', 2.50, 'Bibite', $1)
    `, [idLuigi]);

    console.log("✅ Finito! Due ristoranti pronti.");

  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
};

seed();