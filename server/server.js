// server/server.js - VERSIONE JARVIS V37 (DIAGNOSTICA TOTALE) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 0. DIAGNOSTICA AVVIO (Verifica Chiavi) ---
console.log("------------------------------------------------");
console.log("🚀 JARVIS SERVER V37 IN AVVIO...");
if (process.env.OPENAI_API_KEY) {
    console.log(`🔑 STATO OPENAI: Chiave trovata! (Inizia con: ${process.env.OPENAI_API_KEY.substring(0, 7)}...)`);
} else {
    console.error("❌ STATO OPENAI: CHIAVE MANCANTE! Verifica le variabili su Render.");
}
console.log("------------------------------------------------");

// --- 1. LOGGER DI PRIMO LIVELLO (Vede TUTTO, anche gli errori CORS) ---
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] INGRESSO: ${req.method} ${req.url}`);
    next();
});

// --- 2. CONFIGURAZIONE SICUREZZA DOMINI (CORS) ---
const allowedOrigins = [
    'https://www.cosaedovemangiare.com',
    'https://cosaedovemangiare.com',
    'https://www.cosaedovemangiare.it',
    'http://localhost:5173',
    'http://localhost:3000'
];

app.use(cors({ 
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`🚫 CORS BLOCCATO: Origine non valida -> ${origin}`);
            callback(new Error('Accesso negato dalla policy CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
}));

// --- 3. GESTIONE UPLOAD ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 4. IMPORT ROUTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- 5. ATTIVAZIONE ROUTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 6. GESTIONE ERRORI GLOBALE (Per evitare risposte vuote) ---
app.use((err, req, res, next) => {
    console.error("🔥 ERRORE CRITICO SERVER:", err.message);
    // Se l'errore è di CORS o Multer, lo diciamo al frontend invece di stare zitti
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore interno del server: " + err.message });
    }
});

// --- AVVIO ---
app.listen(port, () => {
    console.log(`✅ Server in ascolto su porta ${port}`);
});

module.exports = app;