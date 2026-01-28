// server/server.js - VERSIONE JARVIS V70 (ITALIAN TIME FIX) 🇮🇹

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const pool = require('./config/db'); 

// --- IMPORTIAMO IL GESTORE ORARIO ITALIANO ---
// Assicurati che utils/time.js esista e contenga getItalyDateComponents
const { getNowItaly, getTimeItaly, getItalyDateComponents } = require('./utils/time'); 

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAZIONE SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT"]
    }
});

// Gestione connessioni Socket
io.on('connection', (socket) => {
    console.log(`⚡ [${getTimeItaly()}] Client connesso: ${socket.id}`);

    socket.on('join_room', (ristorante_id) => {
        const room = String(ristorante_id);
        socket.join(room);
        console.log(`🟢 [${getTimeItaly()}] Socket ${socket.id} entrato nella stanza: [${room}]`);
        socket.emit('room_joined', room); 
    });

    socket.on('disconnect', () => {
        console.log(`🔴 [${getTimeItaly()}] Socket ${socket.id} disconnesso`);
    });
});

// --- LOGICA AUTO-PAUSA (SaaS Mode - ORA ITALIANA REALE) ---
const checkExpirations = async () => {
    const { year, month, day } = getItalyDateComponents();
    const todayItaly = `${year}-${month}-${day}`;
    console.log(`🔍 [J.A.R.V.I.S.] Controllo scadenze moduli al ${todayItaly}...`);
    
    try {
        // 1. Menu Digitale (Se scade, disattiva tutto l'account o solo il modulo? Di solito il menu è la base)
        await pool.query("UPDATE ristoranti SET modulo_menu_digitale = FALSE WHERE scadenza_menu_digitale < $1 AND modulo_menu_digitale = TRUE", [todayItaly]);

        // 2. Ordini Clienti
        await pool.query("UPDATE ristoranti SET modulo_ordini_clienti = FALSE WHERE scadenza_ordini_clienti < $1 AND modulo_ordini_clienti = TRUE", [todayItaly]);

        // 3. Magazzino
        await pool.query("UPDATE ristoranti SET modulo_magazzino = FALSE WHERE scadenza_magazzino < $1 AND modulo_magazzino = TRUE", [todayItaly]);

        // 4. HACCP
        await pool.query("UPDATE ristoranti SET modulo_haccp = FALSE WHERE scadenza_haccp < $1 AND modulo_haccp = TRUE", [todayItaly]);
        
        // 5. Cassa/Suite
        await pool.query("UPDATE ristoranti SET modulo_cassa = FALSE, cassa_full_suite = FALSE WHERE scadenza_cassa < $1 AND modulo_cassa = TRUE", [todayItaly]);

        console.log("✅ Controllo scadenze granulari completato.");
    } catch (e) {
        console.error("❌ Errore critico controllo scadenze:", e.message);
    }
};

// Esegui il controllo all'avvio
checkExpirations();

// Rendiamo "io" disponibile nelle rotte
app.set('io', io);

// --- 0. LOGGER "RAGGI X" (CON ORA ITALIANA) ---
app.use((req, res, next) => {
    console.log(`📡 [${getNowItaly()}] ${req.method} ${req.url}`);
    next();
});

// --- 1. SICUREZZA ---
const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// --- 2. MIDDLEWARE ---
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
    console.error(`🔥 [${getNowItaly()}] ERRORE SERVER:`, err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore V70: " + err.message });
    }
});

// --- AVVIO ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V70 pronto su porta ${port}`);
    console.log(`🕒 Orario Server Italia: ${getNowItaly()}`);
});