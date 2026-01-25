// server/server.js - VERSIONE JARVIS V55 (PRIORITÀ ASSOLUTA)
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

// Percorso confermato dai log precedenti
const INDEX_PATH = path.join(__dirname, '..', 'client', 'index.html');

// --- SOCKET.IO ---
const server = http.createServer(app); 
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST", "PUT"] } });
io.on('connection', (s) => { s.on('join_room', (r) => { s.join(String(r)); }); });
app.set('io', io);

// --- MIDDLEWARE BASE ---
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  🛑 ZONA SEO (PRIORITÀ MASSIMA)
//  Questa logica DEVE stare PRIMA di qualsiasi altra rotta o file statico.
// ===========================================================================
app.use(async (req, res, next) => {
    // 1. FILTRO: Se è una richiesta API o un file statico (js, css, png), lascia passare
    if (req.url.startsWith('/api') || req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|ttf|map|json)$/)) {
        return next();
    }

    // Se siamo qui, l'utente sta chiedendo una pagina (es. /pizzeria-stark)
    const slug = req.path.substring(1); // Rimuove lo slash iniziale
    
    // Ignora la home page ("") o richieste strane
    if (!slug || slug.length === 0) return next();

    console.log(`🛡️ INTERCETTAZIONE SEO per: /${slug}`);

    // 2. Dati Default
    let title = "Cosa e Dove Mangiare";
    let desc = "Menu Digitale e Ordini Online";
    let image = `${DOMAIN}/logo-default.png`; 

    let seoFound = false;

    // 3. Cerca nel DB
    try {
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            
            title = `${r.nome} | Menu Digitale`;
            desc = `Ordina subito da ${r.nome}!`;
            
            // Fix URL Immagine
            let rawImg = style.logo_url || style.cover_url;
            if (rawImg) {
                if (rawImg.startsWith('http')) {
                    image = rawImg;
                } else {
                    image = `${DOMAIN}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
                }
            }
            seoFound = true;
            console.log(`✅ SEO Trovato: ${title}`);
        }
    } catch (e) {
        console.error("⚠️ Errore DB SEO:", e.message);
        // Continua comunque per servire la pagina
    }

    // 4. SE È UNA PAGINA VALIDA (O anche se non trovata ma sembra una rotta frontend), INVIA HTML MODIFICATO
    // Se abbiamo trovato il ristorante O se non è un file statico, proviamo a servire l'index processato
    if (fs.existsSync(INDEX_PATH)) {
        try {
            let htmlData = fs.readFileSync(INDEX_PATH, 'utf8');

            // Sostituzione
            htmlData = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            // IMPORTANTE: Invia 200 OK e ferma qui la richiesta.
            // Non fa next(), quindi le altre rotte non vengono eseguite.
            res.setHeader('Content-Type', 'text/html');
            return res.status(200).send(htmlData);

        } catch (err) {
            console.error("❌ Errore lettura index:", err);
            return next(); // In caso di errore grave, lascia provare agli altri handler
        }
    } else {
        console.error("❌ FILE INDEX PERSO (Non dovrebbe accadere)");
        return next();
    }
});
// ===========================================================================


// --- FILE STATICI ---
// Ora carichiamo i file statici. Se la richiesta era per una pagina, è già stata gestita sopra.
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- API ROUTES ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- FALLBACK FINALE ---
// Per la home page (/) o rotte non gestite sopra
app.get('*', (req, res) => {
    if (fs.existsSync(INDEX_PATH)) {
        // Qui serviamo il file senza sostituzioni (o con default) per la Home
        res.sendFile(INDEX_PATH);
    } else {
        res.status(404).send("Client non trovato");
    }
});

// --- AVVIO SERVER ---
server.listen(port, () => {
    console.log(`🚀 JARVIS SERVER V55 (PRIORITY MODE) ONLINE su porta ${port}`);
});