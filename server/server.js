// server/server.js - VERSIONE JARVIS V50 (ULTIMATE SEO FIX)
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
app.use((req, res, next) => {
    // Logga solo le richieste importanti (no immagini/css)
    if (!req.url.match(/\.(js|css|png|jpg|ico|svg|woff2)$/)) {
        console.log(`📡 [${req.method}] ${req.url}`);
    }
    next();
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ===========================================================================
//  SEO INJECTION (PRIORITÀ MASSIMA - PRIMA DI TUTTO IL RESTO)
// ===========================================================================
app.get('/:slug', async (req, res, next) => {
    const slug = req.params.slug;

    // 1. Ignora file statici o API (se la richiesta ha un'estensione tipo .js o inizia con api)
    if (slug.startsWith('api') || slug.includes('.')) return next();

    console.log(`🔍 SEO CHECK per slug: "${slug}"`);

    try {
        // 2. CERCA IL FILE INDEX.HTML (Prova 2 percorsi: dist e root)
        let filePath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
        if (!fs.existsSync(filePath)) {
            // Fallback: se non c'è la build, prova la cartella sorgente (locale)
            filePath = path.join(__dirname, '..', 'client', 'index.html');
        }

        // Se non lo trova nemmeno lì, errore critico
        if (!fs.existsSync(filePath)) {
            console.error("❌ ERRORE CRITICO: index.html non trovato in nessun percorso!");
            console.error("   Cercato in:", path.join(__dirname, '..', 'client', 'dist', 'index.html'));
            return next(); 
        }

        // 3. Recupera Dati Ristorante
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);
        
        let title = "JARVIS Menu";
        let desc = "Menu Digitale";
        let image = "https://www.cosaedovemangiare.it/logo-default.png"; // Logo default

        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            
            title = `${r.nome} | Menu Digitale`;
            desc = `Sfoglia il menu di ${r.nome} e ordina le tue specialità!`;
            image = style.logo_url || style.cover_url || image;
            console.log(`✅ Ristorante trovato: ${title}`);
        } else {
            console.log(`⚠️ Ristorante non trovato per slug: ${slug}, uso default.`);
        }

        // 4. Leggi e Sostituisci
        fs.readFile(filePath, 'utf8', (err, htmlData) => {
            if (err) {
                console.error("❌ Errore lettura file:", err);
                return next();
            }

            // SOSTITUZIONE DEI SEGNAPOSTO
            const finalHtml = htmlData
                .replace(/__META_TITLE__/g, title)
                .replace(/__META_DESCRIPTION__/g, desc)
                .replace(/__META_IMAGE__/g, image);

            // IMPORTANTE: Manda risposta 200 esplicita
            res.status(200).send(finalHtml);
        });

    } catch (e) {
        console.error("❌ Eccezione SEO:", e);
        next();
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
// Serve sia la root che la dist per sicurezza
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));
app.use(express.static(path.join(__dirname, '..', 'client')));

// --- FALLBACK FINALE (PER REACT ROUTER) ---
app.get('*', (req, res) => {
    // Tenta di servire l'index.html dalla build, altrimenti dal source
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
    console.log(`✅ JARVIS SERVER V50 ONLINE su porta ${port}`);
    console.log(`📂 Cartella server corrente: ${__dirname}`);
});