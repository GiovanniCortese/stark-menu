// server/server.js - VERSIONE JARVIS V42 (X-RAY MODE) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 0. LOGGER "RAGGI X" (Messaggio spostato IN CIMA) ---
// Ora vedremo la richiesta PRIMA che il CORS possa bloccarla
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] INGRESSO: ${req.method} ${req.url}`);
    console.log(`   👉 Origin dichiarata: ${req.headers.origin || 'Nessuna (Server/Postman)'}`);
    next();
});

// --- 1. CONFIGURAZIONE SICUREZZA (CORS "Blindato") ---
const allowedOrigins = [
    'https://www.cosaedovemangiare.com',
    'https://cosaedovemangiare.com',
    'https://www.cosaedovemangiare.it',
    'https://stark-menu.vercel.app',   // <--- FONDAMENTALE per i telefoni con cache vecchia
    'http://localhost:5173',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Se l'origine è nella lista o è vuota (es. server-to-server), entra
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`🚫 BLOCCO CORS ATTIVATO: L'origine '${origin}' non è in lista.`);
            callback(new Error('Accesso negato dalla policy CORS (Origin non valida)'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Applica le regole
app.use(cors(corsOptions));
// Gestisce le richieste di "controllo" (quelle che causano l'errore 405)
app.options('*', cors(corsOptions));

// --- 2. GESTIONE FILE (50MB) ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 3. IMPORT ROTTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes'); // <--- Qui c'è l'AI
const adminRoutes = require('./routes/adminRoutes');

// --- 4. ATTIVAZIONE ROTTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 5. GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error("🔥 ERRORE CRITICO SERVER:", err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore interno del server (V42): " + err.message });
    }
});

// --- AVVIO ---
app.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V42 ONLINE su porta ${port}`);
    if (process.env.OPENAI_API_KEY) {
        console.log(`🔑 OpenAI Key: Presente (${process.env.OPENAI_API_KEY.substring(0, 5)}...)`);
    } else {
        console.error("❌ ERRORE: OpenAI Key NON trovata nelle variabili!");
    }
});