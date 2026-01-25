// server/server.js - VERSIONE JARVIS V50 (WEBSOCKET ENABLED + SEO FIX) 噫
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const fs = require('fs');     // [NUOVO] Per leggere il file HTML
const path = require('path'); // [NUOVO] Per gestire i percorsi
const pool = require('./config/db'); // [NUOVO] Per i dati SEO dal DB

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
    console.log(`笞｡ Client connesso: ${socket.id}`);

    socket.on('join_room', (ristorante_id) => {
        const room = String(ristorante_id);
        socket.join(room);
        console.log(`泙 Socket ${socket.id} entrato nella stanza: [${room}]`);
        socket.emit('room_joined', room); 
    });

    socket.on('disconnect', () => {
        console.log(`閥 Socket ${socket.id} disconnesso`);
    });
});

app.set('io', io);

// --- 0. LOGGER ---
app.use((req, res, next) => {
    // Ignora log per file statici per pulizia console
    if (!req.url.match(/\.(js|css|png|jpg|ico|svg|json)$/)) {
        console.log(`藤 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    }
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

// --- 2. UPLOAD LIMIT ---
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  SEO & SOCIAL PREVIEW INJECTION (SERVER SIDE)
//  Questa sezione intercetta i link (es. /pizzeria-da-mario) e inietta i Meta Tag
// ===========================================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // Ignora chiamate API, file statici o file con estensione
    if (slug.startsWith('api') || slug.includes('.')) return next();

    try {
        // 1. Cerchiamo i dati del ristorante nel DB per il SEO
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        // 2. Percorso del file index.html (Come da tua indicazione)
        // Usiamo path.resolve per uscire dalla cartella 'server' (..) e entrare in 'client'
        const filePath = path.resolve(__dirname, '../client/index.html'); 

        // 3. Leggiamo l'HTML
        fs.readFile(filePath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error('⚠️ Index.html non trovato nel percorso:', filePath);
                // In caso di errore, lascia che Express gestisca la rotta normalmente (o 404)
                return next();
            }

            // Dati SEO di Default
            let title = "JARVIS Menu";
            let desc = "Menu Digitale Intelligente";
            let image = "https://www.cosaedovemangiare.it/logo-default.png"; // Immagine fallback

            // Se il ristorante esiste, usiamo i suoi dati
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
                
                title = `${r.nome} | Menu Digitale`;
                desc = `Scopri il menu di ${r.nome}, ordina comodamente dal tavolo!`;
                // Usa Logo -> Cover -> Default
                image = style.logo_url || style.cover_url || image;
            }

            // 4. INIEZIONE: Sostituiamo i segnalibri presenti in index.html
            htmlData = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            // 5. Inviamo la pagina HTML manipolata
            res.send(htmlData);
        });

    } catch (e) {
        console.error("Errore SEO Injection:", e);
        next(); 
    }
});
// ===========================================================================

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

// --- FALLBACK STATIC FILES ---
// Serve per servire i file statici (js, css) se non gestiti da Nginx/Vite in dev
app.use(express.static(path.join(__dirname, '../client')));

// --- 5. GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error("櫨 ERRORE CRITICO:", err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore Server V50: " + err.message });
    }
});

// --- AVVIO ---
server.listen(port, () => {
    console.log(`噫 JARVIS SERVER V50 (WEBSOCKET + SEO ACTIVE) su porta ${port}`);
});