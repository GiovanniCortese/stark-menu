// server/server.js - VERSIONE JARVIS V50 (FINAL SEO FIX) 噫
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const fs = require('fs');     
const path = require('path'); 
const pool = require('./config/db'); 

const app = express();
const port = process.env.PORT || 3000;

// --- CONFIGURAZIONE SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT"] }
});

io.on('connection', (socket) => {
    console.log(`笞｡ Client connesso: ${socket.id}`);
    socket.on('join_room', (ristorante_id) => {
        const room = String(ristorante_id);
        socket.join(room);
        socket.emit('room_joined', room); 
    });
});
app.set('io', io);

// --- LOGGER ---
app.use((req, res, next) => {
    if (!req.url.match(/\.(js|css|png|jpg|ico|svg|json|woff2)$/)) {
        console.log(`藤 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    }
    next();
});

// --- SICUREZZA ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  SEO INJECTION (Gestione Prioritaria)
// ===========================================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // Ignora file statici o API
    if (slug.startsWith('api') || slug.includes('.')) return next();

    try {
        // 1. Cerchiamo i dati
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        // 2. Determiniamo il percorso assoluto del file index.html
        // Cerchiamo in ../client/dist/index.html rispetto a questo file (server.js)
        const buildPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');

        if (!fs.existsSync(buildPath)) {
            console.error(`⚠️ SEO ERROR: File non trovato in: ${buildPath}`);
            return next(); // Passa al gestore statico standard
        }

        // 3. Leggiamo il file
        fs.readFile(buildPath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error('⚠️ Errore lettura file:', err);
                return next();
            }

            // Dati Default
            let title = "JARVIS Menu";
            let desc = "Menu Digitale Intelligente";
            let image = "https://www.cosaedovemangiare.it/logo-default.png"; 

            // Se ristorante trovato
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
                
                title = `${r.nome} | Menu`;
                desc = `Sfoglia il menu di ${r.nome} e ordina le tue specialità!`;
                image = style.logo_url || style.cover_url || image;
                
                console.log(`✅ SEO INJECTED per: ${slug} -> ${title}`);
            }

            // 4. Sostituzione
            const finalHtml = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            res.send(finalHtml);
        });

    } catch (e) {
        console.error("Errore SEO:", e);
        next(); 
    }
});

// --- IMPORT ROTTE ---
const authRoutes = require('./routes/authRoutes');
const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const haccpRoutes = require('./routes/haccpRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/', authRoutes);
app.use('/', menuRoutes);
app.use('/', orderRoutes);
app.use('/', haccpRoutes);
app.use('/', adminRoutes);

// --- SERVIRE FILE STATICI (Produzione) ---
// Serve la cartella dist come root statica
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

// --- FALLBACK REACT ROUTER ---
// Qualsiasi altra rotta non API manda index.html
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send("Errore Critico: index.html non trovato nella cartella client/dist");
    }
});

// --- GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error("櫨 ERRORE:", err.stack);
    if (!res.headersSent) res.status(500).json({ error: "Errore Server: " + err.message });
});

// --- AVVIO ---
server.listen(port, () => {
    console.log(`噫 JARVIS SERVER V50 avviato su porta ${port}`);
    console.log(`📂 Percorso atteso Build: ${path.join(__dirname, '..', 'client', 'dist')}`);
});