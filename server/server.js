// server/server.js - VERSIONE JARVIS V50 (WEBSOCKET ENABLED) 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); // MODIFICA 1: Importa HTTP
const { Server } = require("socket.io"); // MODIFICA 2: Importa Socket.io

const path = require('path');
const fs = require('fs');

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

    socket.on('join_room', (ristorante_id) => {
        // Forza conversione a stringa per evitare mismatch "1" (int) vs "1" (string)
        const room = String(ristorante_id);
        socket.join(room);
        console.log(`🟢 Socket ${socket.id} entrato nella stanza: [${room}]`);
        
        // OPZIONALE: Invia un feedback al client per confermare l'ingresso
        socket.emit('room_joined', room); 
    });

    socket.on('disconnect', () => {
        console.log(`🔴 Socket ${socket.id} disconnesso`);
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

// =========================================================
// GESTIONE FRONTEND + SEO INJECTION (JARVIS SYSTEM)
// =========================================================

// 1. Definisci dove si trova la build del frontend
const buildPath = path.join(__dirname, 'frontend_build');

// 2. Servi i file statici (JS, CSS, Immagini) direttamente
// Express cercherà qui i file. Se trova "assets/style.css", lo manda subito.
app.use(express.static(buildPath));

// 3. Rotta "Jolly" per i Ristoranti (SEO Injection)
// Intercetta tutto ciò che NON è una rotta API (perché le API sono definite sopra)
app.get('/:slug', async (req, res, next) => {
    const { slug } = req.params;

    // Ignora file con estensione (es. robots.txt, favicon.ico) se non gestiti sopra
    if (slug.includes('.')) return next();

    try {
        // A. Cerca i dati nel DB
        const result = await pool.query(
            'SELECT nome, cover_url, logo_url, info_footer, descrizione FROM ristoranti WHERE slug = $1', 
            [slug]
        );

        // B. Leggi il file index.html "grezzo" dalla cartella build
        const indexPath = path.join(buildPath, 'index.html');
        
        fs.readFile(indexPath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error('Errore lettura index.html:', err);
                return res.status(500).send('Errore Caricamento Frontend');
            }

            // C. Se il ristorante NON esiste, manda l'HTML originale (React gestirà il 404)
            if (result.rows.length === 0) {
                return res.send(htmlData);
            }

            const data = result.rows[0];
            const titolo = `${data.nome} | Menu Digitale`;
            const desc = `Sfoglia il menu digitale di ${data.nome} e ordina online.`;
            const immagine = data.cover_url || data.logo_url || 'https://www.cosaedovemangiare.com/default-cover.jpg';
            const url = `https://www.cosaedovemangiare.com/${slug}`;

            // D. INIEZIONE CHIRURGICA (Sostituisce i placeholder della tua build)
            let injectedHtml = htmlData
                .replace(/__META_TITLE__/g, titolo)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, immagine)
                .replace(/__META_URL__/g, url);
                
            // E. Manda al browser/bot il file HTML modificato
            res.send(injectedHtml);
        });

    } catch (e) {
        console.error("Errore SEO:", e);
        // In caso di errore DB, manda comunque il sito (senza SEO ottimizzato ma funzionante)
        res.sendFile(path.join(buildPath, 'index.html'));
    }
});

// 4. Fallback per tutte le altre rotte (React Router)
// Se l'utente va su / o su /login, manda index.html normale
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- AVVIO (Usa server.listen invece di app.listen) ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V50 (WEBSOCKET MODE) su porta ${port}`);
});