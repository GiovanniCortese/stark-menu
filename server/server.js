// server/server.js - JARVIS V70 MODULAR ARCHITECTURE 🚀
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./services/socket.service');

const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARES ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- SERVER & SOCKET ---
const server = http.createServer(app);
const io = initSocket(server); // Inizializza Socket.io centralizzato

// --- MODULI (TUTTO MIGRATO!) ---
app.use('/', require('./modules/auth/auth.routes'));       // Login & Utenti
app.use('/', require('./modules/menu/menu.routes'));       // Prodotti & Categorie
app.use('/', require('./modules/orders/orders.routes'));   // Ordini & KDS
app.use('/', require('./modules/haccp/haccp.routes'));     // Temperature & Etichette
app.use('/', require('./modules/warehouse/warehouse.routes')); // Magazzino & Bolle
app.use('/', require('./modules/admin/admin.routes'));     // Config, Sala, Stats

// --- ERROR HANDLING BASE ---
app.use((err, req, res, next) => {
    console.error("🔥 Error:", err.stack);
    res.status(500).json({ error: "Errore interno del server" });
});

// --- START ---
server.listen(port, () => {
    console.log(`🚀 JARVIS V70 Server è online su porta ${port}`);
    console.log(`✅ Architettura Modulare Attiva.`);
});