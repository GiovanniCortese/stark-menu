// server/server.js - VERSIONE JARVIS V56 (NO-CACHE & FORCE REPLACE)
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
const DOMAIN = "https://www.cosaedovemangiare.it";

// PERCORSO FISSO (Trovato dai tuoi log precedenti)
const INDEX_PATH = path.join(__dirname, '..', 'client', 'index.html');

// --- SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT"] } });
io.on('connection', (s) => { s.on('join_room', (r) => { s.join(String(r)); }); });
app.set('io', io);

// --- MIDDLEWARE ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  1. GESTIONE FILE STATICI (CON ECCEZIONE)
//  Diciamo a Express: "Servi pure le immagini e i CSS, 
//  MA SE QUALCUNO CHIEDE index.html, FERMATI. Ci penso io."
// ===========================================================================
app.use(express.static(path.join(__dirname, '..', 'client'), {
    index: false // <--- QUESTA È LA CHIAVE. Disabilita l'invio automatico dell'index.
}));

// ===========================================================================
//  2. PAGINA DI TEST (Per capire se funziona senza Facebook)
//  Vai su: https://iltuosito.com/debug-test
// ===========================================================================
app.get('/debug-test', (req, res) => {
    if (fs.existsSync(INDEX_PATH)) {
        res.send(`<h1>TUTTO OK</h1><p>Il file index.html esiste in: ${INDEX_PATH}</p>`);
    } else {
        res.send(`<h1>ERRORE</h1><p>Non trovo il file in: ${INDEX_PATH}</p>`);
    }
});

// ===========================================================================
//  3. IL MOTORE SEO (Gestore Unico)
//  Tutto ciò che non è un file statico finisce qui.
// ===========================================================================
app.get('*', async (req, res) => {
    
    // Ignora richieste di file mancanti (es. icone o font rotti)
    if (req.url.includes('.')) return res.status(404).send('Not found');

    const slug = req.path.substring(1); // es. "pizzeria-stark"
    console.log(`🤖 RICHIESTA PAGINA: /${slug}`);

    // Valori di Default
    let title = "Cosa e Dove Mangiare";
    let desc = "Menu Digitale";
    let image = `${DOMAIN}/logo-default.png`; 

    // Recupero Dati DB
    if (slug && slug.length > 0) {
        try {
            const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
                
                title = `${r.nome} | Menu Digitale`;
                desc = `Menu online di ${r.nome}`;
                
                // Fix Immagine
                let rawImg = style.logo_url || style.cover_url;
                if (rawImg) {
                    image = rawImg.startsWith('http') ? rawImg : `${DOMAIN}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
                }
                console.log(`✅ DB OK: Titolo="${title}"`);
            }
        } catch (e) {
            console.error("⚠️ Errore DB:", e.message);
        }
    }

    // LETTURA E SOSTITUZIONE MANUALE
    try {
        if (!fs.existsSync(INDEX_PATH)) {
            return res.status(500).send("Errore Critico: index.html sparito.");
        }

        let htmlData = fs.readFileSync(INDEX_PATH, 'utf8');

        // SOSTITUZIONE AGGRESSIVA
        htmlData = htmlData.replace(/__META_TITLE__/g, title);
        htmlData = htmlData.replace(/__META_DESCRIPTION__/g, desc);
        htmlData = htmlData.replace(/__META_IMAGE__/g, image);

        // HEADER ANTI-CACHE (Per dire a Facebook di non memorizzare errori)
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        
        // INVIA RISPOSTA 200 (Importante per evitare errore 206)
        res.status(200).send(htmlData);

    } catch (error) {
        console.error("❌ ERRORE RENDERING:", error);
        res.status(500).send("Errore interno server");
    }
});

// --- API ROUTES ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- AVVIO SERVER ---
server.listen(port, () => {
    console.log(`🚀 JARVIS V56 ONLINE su porta ${port}`);
    console.log(`📂 Index Path: ${INDEX_PATH}`);
});