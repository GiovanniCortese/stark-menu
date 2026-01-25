// server/server.js - VERSIONE JARVIS V53 (TARGETED FIX)
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

// --- PERCORSO FILE SICURO (Basato sui log di diagnosi) ---
// Abbiamo visto che il file è in ../client/index.html rispetto a questo file
const INDEX_HTML_PATH = path.join(__dirname, '..', 'client', 'index.html');

// --- SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT"] } });
io.on('connection', (s) => { s.on('join_room', (r) => { s.join(String(r)); }); });
app.set('io', io);

// --- MIDDLEWARE ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Log delle richieste per debug
app.use((req, res, next) => {
    if (!req.url.match(/\.(js|css|png|jpg|ico|svg)$/)) {
        console.log(`📡 [${req.method}] RICHIESTA IN ARRIVO: ${req.url}`);
    }
    next();
});

// --- API ROUTES ---
// Queste hanno la precedenza su tutto
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- FILE STATICI ---
// Serve le immagini, i css e i js dalla cartella client
app.use(express.static(path.join(__dirname, '..', 'client')));

// ===========================================================================
//  GESTORE UNIVERSALE PAGINE (SEO + REACT ROUTER)
//  Cattura TUTTO quello che non è API o file statico
// ===========================================================================
app.get('*', async (req, res) => {
    // 1. Controllo di sicurezza: se chiedono un file che manca (es. immagine rotta), dare 404
    if (req.url.includes('.')) {
        return res.status(404).send('File not found');
    }

    const slug = req.path.substring(1); // Rimuove lo slash iniziale (es. "pizzeria-stark")
    console.log(`🔍 ELABORAZIONE PAGINA: "${slug}"`);

    // Dati di Default
    let title = "Cosa e Dove Mangiare";
    let desc = "Menu Digitale";
    let image = `${DOMAIN}/logo-default.png`; 

    try {
        // 2. Se c'è uno slug, cerchiamo nel DB
        if (slug && slug.length > 0) {
            const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
            
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
                
                title = `${r.nome} | Menu Digitale`;
                desc = `Sfoglia il menu di ${r.nome} e ordina online.`;
                
                // Fix Immagine Assoluta
                let rawImg = style.logo_url || style.cover_url;
                if (rawImg) {
                    if (rawImg.startsWith('http')) {
                        image = rawImg;
                    } else {
                        // Assicura che inizi con / se necessario, poi aggiungi dominio
                        const cleanPath = rawImg.startsWith('/') ? rawImg : '/' + rawImg;
                        image = `${DOMAIN}${cleanPath}`;
                    }
                }
                console.log(`✅ SEO DATABASE SUCCESS: ${title}`);
            }
        }

        // 3. Leggi il file HTML (Sappiamo che esiste grazie alla diagnosi)
        if (fs.existsSync(INDEX_HTML_PATH)) {
            let htmlData = fs.readFileSync(INDEX_HTML_PATH, 'utf8');

            // 4. Sostituisci i placeholder
            htmlData = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            // 5. INVIA LA RISPOSTA (Status 200 OK)
            // Usiamo send() e non sendFile() per evitare l'errore 206
            res.status(200).send(htmlData);
        } else {
            console.error("❌ FILE PERSO IMPROVVISAMENTE");
            res.status(500).send("Errore Server: index.html non trovato.");
        }

    } catch (e) {
        console.error("❌ ERRORE RENDERING:", e);
        // Fallback in caso di crash DB: manda comunque l'index pulito
        if (fs.existsSync(INDEX_HTML_PATH)) {
            let htmlData = fs.readFileSync(INDEX_HTML_PATH, 'utf8');
             htmlData = htmlData
                .replace(/__META_TITLE__/g, "Cosa e Dove Mangiare")
                .replace(/__META_DESCRIPTION__/g, "Menu Digitale")
                .replace(/__META_IMAGE__/g, `${DOMAIN}/logo-default.png`);
            res.status(200).send(htmlData);
        } else {
            res.send("Errore critico.");
        }
    }
});

// --- AVVIO SERVER ---
server.listen(port, () => {
    console.log(`✅ JARVIS SERVER V53 ONLINE su porta ${port}`);
    console.log(`📂 HTML Path confermato: ${INDEX_HTML_PATH}`);
});