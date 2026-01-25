// server/server.js - VERSIONE JARVIS V51 (SEO & FACEBOOK FIX)
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
const DOMAIN = "https://www.cosaedovemangiare.it"; // Dominio base per fix immagini

// --- SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT"] } });
io.on('connection', (s) => { s.on('join_room', (r) => { s.join(String(r)); }); });
app.set('io', io);

// --- MIDDLEWARE ---
app.use((req, res, next) => {
    // Logga solo le richieste importanti (ignora immagini/css/js nel log)
    if (!req.url.match(/\.(js|css|png|jpg|jpeg|ico|svg|woff2|ttf|map)$/)) {
        console.log(`📡 [${req.method}] ${req.url}`);
    }
    next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  SEO INJECTION V2 (FIX PER FACEBOOK/WHATSAPP)
// ===========================================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // Ignora file statici (immagini, js, css)
    if (slug.startsWith('api') || slug.includes('.')) return next();

    // PERCORSI POSSIBILI (Li proviamo tutti)
    const possiblePaths = [
        path.join(__dirname, '..', 'client', 'dist', 'index.html'), // Standard
        path.join(__dirname, '..', 'client', 'index.html'),         // No build
        path.join(__dirname, 'client', 'dist', 'index.html'),        // Server nella root
        path.join(__dirname, 'dist', 'index.html'),                  // Dist nella root
        path.join(process.cwd(), 'client', 'dist', 'index.html')     // Basato sulla cartella di avvio
    ];

    let filePath = null;
    
    // Cerca il primo percorso che esiste
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            filePath = p;
            break;
        }
    }

    // --- DEBUG: SE NON TROVA IL FILE, STAMPA L'ERRORE A VIDEO ---
    if (!filePath) {
        console.error("❌ ERRORE: Nessun index.html trovato.");
        return res.send(`
            <h1>ERRORE CONFIGURAZIONE SERVER</h1>
            <p>Il server non riesce a trovare il file index.html.</p>
            <p>Ho cercato in questi percorsi:</p>
            <ul>${possiblePaths.map(p => `<li>${p}</li>`).join('')}</ul>
            <p>Cartella attuale (__dirname): ${__dirname}</p>
        `);
    }

    try {
        // Recupera Dati DB
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        let title = "Cosa e Dove Mangiare";
        let desc = "Menu Digitale";
        let image = "https://www.cosaedovemangiare.it/logo-default.png"; 

        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            title = `${r.nome} | Menu Digitale`;
            desc = `Sfoglia il menu di ${r.nome}`;
            
            // Fix Immagini Relative
            let rawImg = style.logo_url || style.cover_url;
            if (rawImg) {
                image = rawImg.startsWith('http') ? rawImg : `https://www.cosaedovemangiare.it${rawImg.startsWith('/')?'':'/'}${rawImg}`;
            }
        }

        // Leggi e Sostituisci
        let htmlData = fs.readFileSync(filePath, 'utf8');
        htmlData = htmlData
            .replace(/__META_TITLE__/g, title)
            .replace(/__META_DESCRIPTION__/g, desc)
            .replace(/__META_IMAGE__/g, image);

        res.send(htmlData);

    } catch (e) {
        res.send(`<h1>ERRORE DB/CODICE</h1><p>${e.message}</p>`);
    }
});
// ===========================================================================

// --- ROTTE API ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- SERVIRE FILE STATICI (FALLBACK) ---
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- FALLBACK FINALE (PER REACT ROUTER) ---
app.get('*', (req, res) => {
    let index = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    if (!fs.existsSync(index)) index = path.join(__dirname, '..', 'client', 'index.html');
    
    if (fs.existsSync(index)) {
        res.sendFile(index);
    } else {
        res.status(404).send("Errore: Impossibile trovare il file index.html del client.");
    }
});

// --- AVVIO SERVER ---
server.listen(port, () => {
    console.log(`✅ JARVIS SERVER V51 ONLINE su porta ${port}`);
    console.log(`📂 Cartella server corrente: ${__dirname}`);
});