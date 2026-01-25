// server/server.js - VERSIONE JARVIS V51 (SEO FIXED) 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

// --- 🛑 QUESTA RIGA MANCAVA E FACEVA FALLIRE TUTTO ---
const pool = require('./config/db'); 
// -----------------------------------------------------

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

io.on('connection', (socket) => {
    console.log(`⚡ Client connesso: ${socket.id}`);
    socket.on('join_room', (ristorante_id) => {
        const room = String(ristorante_id);
        socket.join(room);
        console.log(`🟢 Socket ${socket.id} entrato nella stanza: [${room}]`);
        socket.emit('room_joined', room); 
    });
    socket.on('disconnect', () => {
        console.log(`🔴 Socket ${socket.id} disconnesso`);
    });
});

app.set('io', io);

app.use((req, res, next) => {
    console.log(`📡 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    next();
});

const corsOptions = {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: '*',
    credentials: true
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- IMPORT ROTTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

// --- ATTIVAZIONE ROTTE ---
app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- GESTIONE ERRORI API ---
app.use((err, req, res, next) => {
    // Ignoriamo gli errori di rendering frontend qui
    if(req.url.indexOf('/api') !== -1) {
        console.error("🔥 ERRORE CRITICO API:", err.stack);
        if (!res.headersSent) {
            res.status(500).json({ error: "Errore Server: " + err.message });
        }
    } else {
        next(err);
    }
});

// =========================================================
// GESTIONE FRONTEND + SEO INJECTION (JARVIS SYSTEM)
// =========================================================

// 1. Definisci dove si trova la build del frontend
const buildPath = path.join(__dirname, 'frontend_build');

// 2. Servi i file statici (JS, CSS, Immagini)
app.use(express.static(buildPath));

// 3. Rotta "Jolly" per i Ristoranti (SEO Injection)
app.get('/:slug', async (req, res, next) => {
    const { slug } = req.params;

    // Ignora file statici o di sistema
    if (slug.includes('.') || slug.startsWith('api')) return next();

    try {
        console.log(`🔍 SEO: Analisi richiesta per slug: ${slug}`);

        // A. Cerca i dati nel DB
        const result = await pool.query(
            'SELECT nome, cover_url, logo_url, info_footer, descrizione FROM ristoranti WHERE slug = $1', 
            [slug]
        );

        // B. Leggi il file index.html
        const indexPath = path.join(buildPath, 'index.html');
        
        fs.readFile(indexPath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error('❌ Errore lettura index.html:', err);
                return res.status(500).send('Errore Caricamento Frontend');
            }

            // C. Se il ristorante NON esiste, manda l'HTML originale
            if (result.rows.length === 0) {
                console.log(`⚠️ Ristorante non trovato: ${slug}`);
                return res.send(htmlData);
            }

            const data = result.rows[0];
            const titolo = `${data.nome}`;
            const desc = `Sfoglia il menu digitale di ${data.nome} e ordina online.`;
            const immagine = data.cover_url || data.logo_url || 'https://www.cosaedovemangiare.com/default-cover.jpg';
            const url = `https://www.cosaedovemangiare.com/${slug}`;

            console.log(`✅ SEO INJECTION: Sostituisco placeholder per ${data.nome}`);

            // D. INIEZIONE CHIRURGICA
            let injectedHtml = htmlData
                .replace(/__META_TITLE__/g, titolo)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, immagine)
                .replace(/__META_URL__/g, url);
                
            // E. Manda al browser
            res.send(injectedHtml);
        });

    } catch (e) {
        console.error("🔥 Errore Critico SEO:", e);
        // Fallback in caso di errore
        res.sendFile(path.join(buildPath, 'index.html'));
    }
});

// 4. Fallback per tutte le altre rotte (React Router)
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V51 (SEO FIXED) su porta ${port}`);
});