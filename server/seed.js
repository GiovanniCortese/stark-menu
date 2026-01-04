// server/seed.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const seedData = async () => {
  try {
    console.log("🌱 Inizio inserimento dati su Neon...");

    // 1. Creiamo tabelle Ristoranti e Prodotti se non esistono (per sicurezza)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ristoranti (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255),
        slug VARCHAR(255) UNIQUE,
        email_titolare VARCHAR(255),
        password VARCHAR(255),
        password_hash VARCHAR(255)
      );
      CREATE TABLE IF NOT EXISTS prodotti (
        id SERIAL PRIMARY KEY,
        ristorante_id INTEGER,
        nome VARCHAR(255),
        prezzo DECIMAL(10,2),
        categoria VARCHAR(50)
      );
    `);

    // 2. Inseriamo il Ristorante
    const resRist = await pool.query(`
      INSERT INTO ristoranti (nome, slug, email_titolare, password, password_hash) 
      VALUES ($1, $2, $3, $4, $5) 
      ON CONFLICT (slug) DO UPDATE SET nome = EXCLUDED.nome
      RETURNING id;
    `, ['Pizzeria Stark', 'pizzeria-stark', 'tony@stark.it', 'admin123', 'hash_segreto']);
    
    const ristoranteId = resRist.rows[0].id;
    console.log(`✅ Ristorante Cloud creato ID: ${ristoranteId}`);

    // 3. Pulizia e inserimento prodotti
    await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [ristoranteId]);

    const prodotti = [
        { nome: 'Margherita', prezzo: 6.00, categoria: 'Pizze' },
        { nome: 'Diavola', prezzo: 7.50, categoria: 'Pizze' },
        { nome: 'Coca Cola', prezzo: 2.50, categoria: 'Bibite' }
    ];

    for (const p of prodotti) {
        await pool.query(`
            INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id)
            VALUES ($1, $2, $3, $4)
        `, [p.nome, p.prezzo, p.categoria, ristoranteId]);
    }

    console.log(`✅ Menu caricato nel Cloud.`);

  } catch (err) {
    console.error("❌ Errore:", err);
  } finally {
    pool.end();
  }
};

seedData();