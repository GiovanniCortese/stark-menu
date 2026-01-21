const { Pool } = require('pg');
require('dotenv').config();

// Verifica che l'URL del database sia presente
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE CRITICO: Manca la variabile DATABASE_URL nel file .env o nelle impostazioni di Render.");
    process.exit(1);
}

// 🔍 Rileva se stiamo usando la connessione interna di Render
// Le connessioni interne contengono solitamente "render.internal"
const isRenderInternal = process.env.DATABASE_URL.includes('render.internal');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // ⚙️ LOGICA SSL:
    // 1. Se sei SU Render e usi la connessione interna -> SSL spento (false)
    // 2. Se ti connetti da fuori (es. dal tuo PC) o usi l'URL esterno -> SSL acceso ({ rejectUnauthorized: false })
    ssl: isRenderInternal ? false : { rejectUnauthorized: false }
});

// Test connessione al riavvio (opzionale ma utile per debug)
pool.connect((err, client, release) => {
    if (err) {
        console.error('❌ Errore connessione DB:', err.message);
    } else {
        console.log(`✅ Connesso al Database (${isRenderInternal ? 'INTERNO ⚡' : 'ESTERNO 🌐'})`);
        release();
    }
});

module.exports = pool;