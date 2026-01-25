// server/server.js - VERSIONE JARVIS V50 (FAIL-SAFE SEO) 噫
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http'); 
const { Server } = require("socket.io"); 
const path = require('path'); 
const pool = require('./config/db'); 

const app = express();
const port = process.env.PORT || 3000;

// --- TEMPLATE HTML IN MEMORIA (Per evitare errori di lettura file) ---
// Questo è esattamente il contenuto del tuo index.html, pronto per l'uso.
const HTML_TEMPLATE = `
<!doctype html>
<html lang="it">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    
    <title>__META_TITLE__</title>
    <meta name="description" content="__META_DESCRIPTION__" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="__META_TITLE__" />
    <meta property="og:description" content="__META_DESCRIPTION__" />
    <meta property="og:image" content="__META_IMAGE__" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="__META_TITLE__" />
    <meta name="twitter:description" content="__META_DESCRIPTION__" />
    <meta name="twitter:image" content="__META_IMAGE__" />

    <script>
      (function() {
        var host = window.location.hostname;
        var path = window.location.pathname;
        if (host.includes('cosaedovemangiare.com') && (path === '/' || path === '')) {
            console.log('⛔ HOME BLOCCATA SU .COM -> RIMBALZO SU .IT');
            window.location.replace("https://www.cosaedovemangiare.it");
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

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
    if (!req.url.match(/\.(js|css|png|jpg|ico|svg|json)$/)) {
        console.log(`藤 [${new Date().toLocaleTimeString('it-IT')}] ${req.method} ${req.url}`);
    }
    next();
});

// --- SICUREZZA & UPLOAD ---
app.use(cors({ origin: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  SEO INJECTION (METODO INFALLIBILE STRINGA)
// ===========================================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // Ignora chiamate API o file (se hanno un'estensione tipo .js, .css, .png)
    if (slug.startsWith('api') || slug.includes('.')) return next();

    try {
        console.log(`🔍 SEO: Elaborazione richiesta per slug: ${slug}`);

        // 1. Dati di Default
        let title = "JARVIS Menu";
        let desc = "Menu Digitale Intelligente";
        let image = "https://www.cosaedovemangiare.it/logo-default.png"; 

        // 2. Cerchiamo il ristorante nel DB
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            
            title = `${r.nome} | Menu`;
            desc = `Scopri il menu di ${r.nome} e ordina le tue specialità preferite!`;
            // Usa Logo -> Cover -> Default
            image = style.logo_url || style.cover_url || image;
        }

        // 3. SOSTITUZIONE DIRETTA NELLA STRINGA (Nessun file system coinvolto)
        const finalHtml = HTML_TEMPLATE
            .replace(/__META_TITLE__/g, title)
            .replace(/__META_DESCRIPTION__/g, desc)
            .replace(/__META_IMAGE__/g, image);

        // 4. Invio risposta
        res.send(finalHtml);

    } catch (e) {
        console.error("Errore SEO Injection:", e);
        next(); 
    }
});
// ===========================================================================

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

// --- FALLBACK STATIC FILES ---
// Serve la cartella client (root) per caricare main.jsx, vite.svg, etc.
app.use(express.static(path.join(__dirname, '../client')));

// Fallback per tutte le altre rotte non gestite (React Router)
app.get('*', (req, res) => {
    // Anche qui usiamo il template in memoria per sicurezza
    res.send(HTML_TEMPLATE
        .replace(/__META_TITLE__/g, "JARVIS Menu")
        .replace(/__META_DESCRIPTION__/g, "App Ristorazione")
        .replace(/__META_IMAGE__/g, "")
    );
});

// --- GESTIONE ERRORI ---
app.use((err, req, res, next) => {
    console.error("櫨 ERRORE CRITICO:", err.stack);
    if (!res.headersSent) {
        res.status(500).json({ error: "Errore Server V50: " + err.message });
    }
});

// --- AVVIO ---
server.listen(port, () => {
    console.log(`噫 JARVIS SERVER V50 (SEO HARDCODED FIX) su porta ${port}`);
});