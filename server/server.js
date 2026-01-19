// server/server.js - VERSIONE JARVIS V36 (DEBUG & LOGGING ATTIVI) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURAZIONE SICUREZZA DOMINI (CORS) ---
// Qui definiamo chi ha il permesso di parlare con JARVIS
const allowedOrigins = [
    'https://www.cosaedovemangiare.com',
    'https://cosaedovemangiare.com',
    'https://www.cosaedovemangiare.it',
    // 'https://stark-menu.vercel.app', // RIMOSSO: Vecchio dominio eliminato
    'http://localhost:5173',
    'http://localhost:3000'
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
    credentials: true 
}));

// --- [NUOVO] LOGGER DI DIAGNOSTICA ---
// Questo serve per vedere sui Log di Render se la richiesta della foto arriva davvero
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] RICHIESTA: ${req.method} ${req.url}`);
    next();
});

// --- 2. GESTIONE UPLOAD (Foto Piatti/HACCP) ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 3. IMPORT DEI MODULI (ROTTE) ---
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
app.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V36 avviato su porta ${port}`);
    console.log(`🌍 Domini autorizzati: ${allowedOrigins.length}`);
});

module.exports = app;