// server/server.js - VERSIONE JARVIS V52 (FINAL FIX) 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');
const pool = require('./config/db'); // Database connection

const app = express();
// CAMBIO PORTA: Usiamo la 80 (Standard Web) per evitare blocchi Firewall
const port = process.env.PORT || 80; 

// --- CONFIGURAZIONE SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST", "PUT"] }
});

io.on('connection', (socket) => {
    // Gestione socket ( invariata )
    socket.on('join_room', (r_id) => { socket.join(String(r_id)); });
});
app.set('io', io);

// --- LOGGER PER CAPIRE CHI CHIAMA ---
app.use((req, res, next) => {
    // Logga anche lo User-Agent per vedere se è Facebook
    console.log(`📡 [${req.method}] ${req.url} - Agent: ${req.get('User-Agent')}`);
    next();
});

// --- 1. FIX PRIORITARIO PER FACEBOOK/WHATSAPP (ROBOTS.TXT) ---
// LO METTIAMO PRIMA DI TUTTO IL RESTO!
app.get('/robots.txt', (req, res) => {
    console.log("🤖 Facebook/Bot sta chiedendo robots.txt -> ACCESSO CONSENTITO");
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /");
});
// -------------------------------------------------------------

// --- SICUREZZA ---
app.use(cors({ origin: true, methods: ['GET','POST','PUT','DELETE','OPTIONS'], credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- API ROUTES ---
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

// --- GESTIONE ERRORI API ---
app.use((err, req, res, next) => {
    if(req.url.startsWith('/api')) {
        console.error("🔥 ERRORE API:", err.message);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    } else { next(err); }
});

// =========================================================
// GESTIONE FRONTEND + SEO INJECTION
// =========================================================
const buildPath = path.join(__dirname, 'frontend_build');

// Servi file statici PRIMA della rotta slug, MA DOPO le API
app.use(express.static(buildPath));

// Rotta Ristoranti (SEO)
app.get('/:slug', async (req, res, next) => {
    const { slug } = req.params;

    // Ignora file di sistema che potrebbero essere sfuggiti
    if (slug.includes('.') || slug.startsWith('api')) return next();

    try {
        console.log(`🔍 SEO REQUEST per: ${slug}`);
        
        // Query al DB
        const result = await pool.query(
            'SELECT nome, cover_url, logo_url, info_footer, descrizione FROM ristoranti WHERE slug = $1', 
            [slug]
        );

        const indexPath = path.join(buildPath, 'index.html');
        fs.readFile(indexPath, 'utf8', (err, htmlData) => {
            if (err) return res.status(500).send('Errore Server Frontend');

            if (result.rows.length === 0) return res.send(htmlData); // Nessun ristorante trovato

            const data = result.rows[0];
            const titolo = `${data.nome}`; // Titolo pulito
            const desc = `Ordina online dal menu digitale di ${data.nome}.`;
            // Se cover_url è vuoto, usa logo_url, altrimenti placeholder
            const immagine = data.cover_url || data.logo_url || 'https://www.cosaedovemangiare.it/img/placeholder.jpg';
            const url = `https://www.cosaedovemangiare.com/${slug}`;

            // Sostituzione
            let injectedHtml = htmlData
                .replace(/__META_TITLE__/g, titolo)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, immagine)
                .replace(/__META_URL__/g, url);
                
            res.send(injectedHtml);
        });
    } catch (e) {
        console.error("SEO Error:", e);
        res.sendFile(path.join(buildPath, 'index.html'));
    }
});

// Fallback finale
app.get('*', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
});

// --- AVVIO SU PORTA 80 ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V52 ONLINE su PORTA ${port}`);
    console.log(`🌍 TESTA SU: http://${process.env.PUBLIC_IP || 'TUO_IP'}/pizzeria-stark`);
});