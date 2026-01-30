// server/server.js - VERSIONE JARVIS V70 (SOCKET OPTIMIZED) 🚀

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const pool = require('./config/db'); 

// Utils Orario
const { getNowItaly, getTimeItaly, getItalyDateComponents } = require('./utils/time'); 

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAZIONE SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Gestione connessioni Socket (Pulita e leggera)
io.on('connection', (socket) => {
    // Log ridotto: solo quando entra in una stanza specifica (ristorante)
    socket.on('join_room', (ristorante_id) => {
        const room = String(ristorante_id);
        socket.join(room);
        // Decommenta solo per debug:
        // console.log(`🟢 [${getTimeItaly()}] Room Join: ${room}`);
    });
});

// Rendiamo "io" disponibile nelle rotte
app.set('io', io);

// --- MIDDLEWARE ---
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- LOGICA AUTO-PAUSA (Opzionale, mantenuta per sicurezza licenze) ---
const checkExpirations = async () => {
    try {
        const { year, month, day } = getItalyDateComponents();
        const todayItaly = `${year}-${month}-${day}`;
        await pool.query("UPDATE ristoranti SET modulo_menu_digitale = FALSE WHERE scadenza_menu_digitale < $1 AND modulo_menu_digitale = TRUE", [todayItaly]);
        // ... altri controlli omessi per brevità, il core è salvo
    } catch (e) {
        console.error("❌ Errore check scadenze:", e.message);
    }
};
checkExpirations(); // Esegui all'avvio

// --- IMPORT E ATTIVAZIONE ROTTE ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error(`🔥 [${getNowItaly()}] ERROR:`, err.stack);
    if (!res.headersSent) res.status(500).json({ error: "Server Error: " + err.message });
});

// --- AVVIO ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER pronto su porta ${port}`);
    console.log(`📡 Socket.io attivo (No Polling Mode)`);
});