// server/server.js - VERSIONE JARVIS V34 (CORS PRO & MODULAR) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURAZIONE SICUREZZA DOMINI (CORS) ---
// Qui definiamo chi ha il permesso di parlare con JARVIS
const allowedOrigins = [
    'https://www.cosaedovemangiare.com', // Il tuo Nuovo Dominio PRO
    'https://cosaedovemangiare.com',     // Redirect
    'https://www.cosaedovemangiare.it',  // Il Portale (fondamentale per la "Maschera")
    'https://menu.cosaedovemangiare.it', // I vecchi menu Legacy
    'https://app.cosaedovemangiare.it',  // Eventuali sottodomini futuri
    'http://localhost:5173',             // Sviluppo Locale (Frontend Vite)
    'http://localhost:3000'              // Sviluppo Locale (Backend)
];

app.use(cors({ 
    origin: function (origin, callback) {
        // Permetti richieste server-to-server (senza origin) o se l'origine è nella lista
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log("⚠️ RICHIESTA BLOCCATA DA:", origin);
            callback(new Error('Accesso negato dalla policy CORS di Jarvis'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true // Importante per mantenere le sessioni se servono
}));

// --- 2. GESTIONE UPLOAD (Foto Piatti/HACCP) ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 3. IMPORT DEI MODULI (ROTTE) ---
// ⚠️ Assicurati che questi file esistano nella cartella /routes!
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- 4. UTILIZZO DELLE ROTTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 5. ROUTE DI VERIFICA (REDIRECT) ---
app.get('/', (req, res) => {
    // Se chiamano la root del server, li mandiamo al portale
    res.redirect('https://www.cosaedovemangiare.it');
});

// --- AVVIO SERVER ---
// Se siamo in locale (o su un server classico) usiamo la porta.
// Su Vercel, non serve specificare la porta, ci pensa lui.
if (process.env.NODE_ENV !== 'production') {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`🚀 JARVIS SERVER V34 avviato su porta ${port}`);
        console.log(`🌍 Domini autorizzati: ${allowedOrigins.length}`);
    });
}

// FONDAMENTALE PER VERCEL: Esportare l'app
module.exports = app;