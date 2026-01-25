// server/server.js - VERSIONE DIAGNOSTICA (TROVA IL FILE PERSO)
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
//  🔍 DIAGNOSTICA AVVIO - CERCHIAMO INDEX.HTML
// ===========================================================================
console.log("\n--- 🔍 AVVIO DIAGNOSTICA FILE SYSTEM ---");
console.log("Cartella corrente (__dirname):", __dirname);
console.log("Cartella di lavoro (cwd):", process.cwd());

// Funzione per cercare index.html ricorsivamente (limitata a 3 livelli)
function findIndexHtml(dir, depth = 0) {
    if (depth > 3) return null;
    try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
                const found = findIndexHtml(fullPath, depth + 1);
                if (found) return found;
            } else if (file === 'index.html') {
                return fullPath;
            }
        }
    } catch (e) { return null; }
    return null;
}

// Cerchiamo il file partendo dalla cartella superiore
const FOUND_INDEX_PATH = findIndexHtml(path.join(__dirname, '..'));

if (FOUND_INDEX_PATH) {
    console.log("✅ FILE TROVATO IN:", FOUND_INDEX_PATH);
} else {
    console.log("❌ ERRORE GRAVE: index.html NON TROVATO nel server!");
}
console.log("----------------------------------------\n");
// ===========================================================================

// --- SEO INJECTION ---
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // Ignora file con estensioni o api
    if (slug.startsWith('api') || slug.includes('.')) return next();

    // Se non abbiamo trovato il file all'avvio, è inutile provare
    if (!FOUND_INDEX_PATH) {
        console.error("❌ SEO SALTATO: File index.html perso.");
        return next();
    }

    try {
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        let title = "Cosa e Dove Mangiare";
        let desc = "Menu Digitale";
        let image = "https://www.cosaedovemangiare.it/logo-default.png"; 

        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            
            title = `${r.nome} | Menu Digitale`;
            desc = `Sfoglia il menu di ${r.nome}`;
            let rawImg = style.logo_url || style.cover_url;
            if (rawImg) {
                // Forza URL assoluto
                image = rawImg.startsWith('http') ? rawImg : `https://www.cosaedovemangiare.it${rawImg.startsWith('/')?'':'/'}${rawImg}`;
            }
            console.log(`✅ SEO OK per ${slug} -> Uso immagine: ${image}`);
        }

        // LETTURA DAL PERCORSO TROVATO DALLA DIAGNOSTICA
        let htmlData = fs.readFileSync(FOUND_INDEX_PATH, 'utf8');
        htmlData = htmlData
            .replace(/__META_TITLE__/g, title)
            .replace(/__META_DESCRIPTION__/g, desc)
            .replace(/__META_IMAGE__/g, image);

        res.send(htmlData);

    } catch (e) {
        console.error("❌ Errore SEO:", e);
        next();
    }
});

// --- API ROUTES ---
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/menuRoutes'));
app.use('/', require('./routes/orderRoutes'));
app.use('/', require('./routes/haccpRoutes'));
app.use('/', require('./routes/adminRoutes'));

// --- STATIC FILES ---
// Usa il percorso trovato o fallback standard
if (FOUND_INDEX_PATH) {
    const staticDir = path.dirname(FOUND_INDEX_PATH);
    app.use(express.static(staticDir));
} else {
    app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
}

// --- FALLBACK FINALE ---
app.get('*', (req, res) => {
    if (FOUND_INDEX_PATH) {
        res.sendFile(FOUND_INDEX_PATH);
    } else {
        res.status(404).send("ERRORE CRITICO: Impossibile trovare index.html sul server.");
    }
});

server.listen(port, () => {
    console.log(`✅ Server avviato sulla porta ${port}`);
});