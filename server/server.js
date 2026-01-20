// server/server.js - VERSIONE JARVIS V50 (WEBSOCKET ENABLED) 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // MODIFICA 1: Importa HTTP
const { Server } = require("socket.io"); // MODIFICA 2: Importa Socket.io

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAZIONE SOCKET.IO ---
const server = http.createServer(app); // Crea server HTTP
const io = new Server(server, {
    cors: {
        origin: "*", // Accetta tutto (come il tuo Open Gate)
        methods: ["GET", "POST", "PUT"]
    }
});

// Gestione connessioni Socket
io.on('connection', (socket) => {
    console.log(`⚡ Client connesso: ${socket.id}`);

    // Il client si unirà a una "stanza" basata sull'ID del ristorante
    socket.on('join_room', (ristorante_id) => {
        socket.join(ristorante_id);
        console.log(`Socket ${socket.id} è entrato nella stanza: ${ristorante_id}`);
    });

    socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnesso`);
    });
});

// Rendiamo "io" disponibile ovunque nelle rotte tramite req.app.get('io')
app.set('io', io);

// --- 0. LOGGER "RAGGI X" ---
app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    next();
});

// --- 1. SICUREZZA "PORTE APERTE" ---
const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

// --- 5. GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error("🔥 ERRORE CRITICO:", err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore Server V50: " + err.message });
    }
});

// --- AVVIO (Usa server.listen invece di app.listen) ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V50 (WEBSOCKET MODE) su porta ${port}`);
});