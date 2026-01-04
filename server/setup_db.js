require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME, // Assicurati che questo DB esista
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const sqlQuery = `
-- Crea le tabelle se non esistono
CREATE TABLE IF NOT EXISTS ristoranti (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    email_titolare VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    ordini_attivi BOOLEAN DEFAULT FALSE,
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categorie (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id),
    nome VARCHAR(50) NOT NULL,
    ordine_visualizzazione INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS prodotti (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id),
    categoria_id INTEGER REFERENCES categorie(id),
    nome VARCHAR(100) NOT NULL,
    descrizione TEXT,
    prezzo DECIMAL(10, 2) NOT NULL,
    foto_url TEXT,
    visibile BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS ordini (
    id SERIAL PRIMARY KEY,
    ristorante_id INTEGER REFERENCES ristoranti(id),
    tavolo VARCHAR(10),
    totale DECIMAL(10, 2),
    stato_ordine VARCHAR(20) DEFAULT 'in_attesa',
    stato_pagamento BOOLEAN DEFAULT FALSE,
    stato_stampa VARCHAR(20) DEFAULT 'pending',
    note_cliente TEXT,
    data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const setup = async () => {
  try {
    console.log("⏳ Connessione al database in corso...");
    await pool.query(sqlQuery);
    console.log("✅ Tabelle create con successo! Il Database è pronto.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Errore durante la creazione delle tabelle:", err.message);
    console.log("SUGGERIMENTO: Hai creato il database 'menu_platform' in Postgres?");
    process.exit(1);
  }
};

setup();