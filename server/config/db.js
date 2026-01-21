const { Pool } = require('pg');
require('dotenv').config();

// Verifica presenza URL
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE CRITICO: Manca DATABASE_URL nel file .env");
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // LOGICA ROBUSTA:
    // Se siamo su localhost (sviluppo), l'SSL spesso non serve.
    // Se siamo in produzione (Render/Neon), l'SSL è OBBLIGATORIO e richiede rejectUnauthorized: false
    ssl: process.env.NODE_ENV === 'production' || process.env.DATABASE_URL.includes('render.com') 
        ? { rejectUnauthorized: false } 
        : false 
});

// Test connessione immediato all'avvio
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ ERRORE CONNESSIONE DB:', err.message);
        console.error('Suggerimento: Controlla di usare la EXTERNAL URL su Render.');
    } else {
        console.log('✅ DATABASE CONNESSO CORRETTAMENTE 🚀');
        release();
    }
});

module.exports = pool;