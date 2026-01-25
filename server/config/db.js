// server/config/db.js
const { Pool } = require('pg');
const path = require('path');

// Forza il caricamento del .env dalla cartella server/
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Verifica presenza URL
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE CRITICO: Manca DATABASE_URL nel file .env");
    // Mostriamo il percorso dove il sistema sta cercando il file per facilitare il debug
    console.error("Percorso cercato:", path.join(__dirname, '../.env'));
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
        console.error('Suggerimento: Se sei su iMac, assicurati di usare la EXTERNAL URL di Render.');
    } else {
        console.log('✅ DATABASE CONNESSO CORRETTAMENTE 🚀');
        release();
    }
});

module.exports = pool;