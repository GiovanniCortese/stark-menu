// server/server.js - VERSIONE JARVIS V43 (OPEN GATE & DEBUG) 🌍
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// --- 0. LOGGER "RAGGI X" (Vede tutto quello che tocca il server) ---
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    // Se c'è un'origine, la stampiamo per capire chi sta chiamando
    if (req.headers.origin) console.log(`   👉 Origin: ${req.headers.origin}`);
    next();
});

// --- 1. SICUREZZA "PORTE APERTE" (Per sbloccare la cache dei telefoni) ---
const corsOptions = {
    origin: true, // <--- Accetta QUALSIASI origine (riflette quella in ingresso)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*', // <--- Accetta QUALSIASI header (importante per i file/multipart)
    credentials: true
};

// Applica CORS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Risponde OK a tutti i preflight

// --- 2. GESTIONE UPLOAD MAXI ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- 3. IMPORT ROTTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- 4. ATTIVAZIONE ROTTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- 5. GESTIONE ERRORI GLOBALE ---
app.use((err, req, res, next) => {
    console.error("🔥 ERRORE CRITICO:", err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore Server V43: " + err.message });
    }
});

// --- AVVIO ---
app.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V43 (OPEN MODE) su porta ${port}`);
    if (process.env.OPENAI_API_KEY) {
        console.log(`🔑 OpenAI Key: Presente (${process.env.OPENAI_API_KEY.substring(0, 5)}...)`);
    } else {
        console.error("❌ ERRORE: OpenAI Key NON trovata!");
    }
});