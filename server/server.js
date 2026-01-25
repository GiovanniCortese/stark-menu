// server/server.js - VERSIONE JARVIS V57 (TOTAL OVERRIDE)
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

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  🛑 ZONA SEO (PRIORITÀ ASSOLUTA - PRIMA DEI FILE STATICI)
// ===========================================================================
app.use(async (req, res, next) => {
    // 1. IDENTIFICAZIONE: È una richiesta per una pagina web?
    // Se l'URL contiene un'estensione (es. .js, .css, .png, .ico), NON è una pagina. Lascia passare.
    // Escludiamo anche le chiamate API.
    const isFile = req.url.match(/\.[0-9a-z]+$/i);
    const isApi = req.url.startsWith('/api') || req.url.startsWith('/socket.io');

    if (isFile || isApi) {
        return next(); // Passa la palla al gestore dei file statici o API
    }

    // --- SE SIAMO QUI, È UNA PAGINA (es. /pizzeria-stark o /debug-test) ---
    const slug = req.path.substring(1); // Rimuove lo slash iniziale
    console.log(`🛡️ INTERCEPTOR SEO attivo per: /${slug}`);

    // Dati Default
    let title = "Cosa e Dove Mangiare";
    let desc = "Menu Digitale e Ordini Online";
    let image = `${DOMAIN}/logo-default.png`; 

    // 2. Cerca nel DB (Solo se c'è uno slug valido)
    if (slug && slug.length > 0 && slug !== 'debug-test') {
        try {
            const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
            if (result.rows.length > 0) {
                const r = result.rows[0];
                const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
                
                title = `${r.nome} | Menu Digitale`;
                desc = `Sfoglia il menu di ${r.nome} e ordina le tue specialità!`;
                
                // Fix URL Immagine
                let rawImg = style.logo_url || style.cover_url;
                if (rawImg) {
                    image = rawImg.startsWith('http') ? rawImg : `${DOMAIN}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
                }
                console.log(`✅ RISTORANTE TROVATO: ${title}`);
            }
        } catch (e) {
            console.error("⚠️ DB Error:", e.message);
        }
    }

    // 3. CARICAMENTO E INIEZIONE (Manuale)
    // Non usiamo sendFile, usiamo readFile + send per forzare il codice 200
    if (fs.existsSync(INDEX_PATH)) {
        try {
            let htmlData = fs.readFileSync(INDEX_PATH, 'utf8');

            // Sostituzione
            htmlData = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            // IMPORTANTE: Header per disabilitare cache strane di Facebook
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            
            // Debug visivo se richiesto
            if (req.path === '/debug-test') {
                return res.send(`<h1>DEBUG OK</h1><p>Se leggi questo, il server Node ha intercettato la richiesta.</p>`);
            }

            return res.status(200).send(htmlData); // STOP QUI. Non fa next().

        } catch (err) {
            console.error("❌ Errore lettura index:", err);
            return next();
        }
    } else {
        console.error("❌ ERRORE CRITICO: Index non trovato in " + INDEX_PATH);
        return res.status(500).send("Errore configurazione server: Index mancante.");
    }
});
// ===========================================================================

// --- FILE STATICI (Vengono serviti SOLO se il blocco sopra ha fatto next) ---
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- API ROUTES ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- FALLBACK FINALE ---
// Se qualcuno chiede una pagina che non esiste e il blocco SEO ha fallito
app.get('*', (req, res) => {
    res.status(404).send("Pagina non trovata o Errore Server");
});

// --- AVVIO SERVER ---
server.listen(port, () => {
    console.log(`🚀 JARVIS V57 ONLINE su porta ${port}`);
});