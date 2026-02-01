// server/server.js - NEW MODULAR ARCHITECTURE
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { initSocket } = require('./services/socket.service'); // Nuovo Import

const app = express();
const port = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- SERVER HTTP & SOCKET ---
const server = http.createServer(app);
const io = initSocket(server); // Inizializza il socket centralizzato

// --- IMPORT MODULI (Stiamo migrando uno alla volta) ---
app.use('/', require('./modules/auth/auth.routes'));

// --- ROTTE VECCHIE (TEMP: Le teniamo finché non migriamo gli altri moduli) ---
// app.use('/', require('./routes/authRoutes'));  <-- RIMOSSO (Sostituito dal modulo sopra)
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- START ---
server.listen(port, () => {
    console.log(`🚀 JARVIS Server Modular avviato su porta ${port}`);
});