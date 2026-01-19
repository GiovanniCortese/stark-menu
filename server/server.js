// server/server.js - VERSIONE JARVIS V41 (STABLE & CACHE FRIENDLY) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 1. CONFIGURAZIONE SICUREZZA (CORS AVANZATO) ---
const allowedOrigins = [
    'https://www.cosaedovemangiare.com',
    'https://cosaedovemangiare.com',
    'https://www.cosaedovemangiare.it',
    'https://stark-menu.vercel.app',  // <--- REINSERITO: Serve per i telefoni con vecchia cache!
    'http://localhost:5173',
    'http://localhost:3000'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Se non c'è origin (server-to-server) o è nella lista, approva
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log(`🚫 CORS BLOCK: ${origin}`); // Logga chi viene bloccato
            callback(new Error('Bloccato da CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Applica CORS a tutte le richieste
app.use(cors(corsOptions));
// ⚠️ FIX 405: Abilita esplicitamente le richieste "Preflight" (OPTIONS)
app.options('*', cors(corsOptions));

// --- 2. LOGGER DIAGNOSTICO ---
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    next();
});

// --- 3. GESTIONE BODY E FILE ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 4. IMPORT ROTTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- 5. MONTAGGIO ROTTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 6. GESTIONE ERRORI GLOBALE ---
app.use((err, req, res, next) => {
    console.error("🔥 ERRORE SERVER:", err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore interno del server (V41)" });
    }
});

// --- AVVIO ---
app.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V41 ONLINE su porta ${port}`);
    if (process.env.OPENAI_API_KEY) {
        console.log(`🔑 OpenAI Key rilevata: ${process.env.OPENAI_API_KEY.substring(0, 5)}...`);
    } else {
        console.error("❌ ATTENZIONE: OpenAI Key MANCANTE!");
    }
});