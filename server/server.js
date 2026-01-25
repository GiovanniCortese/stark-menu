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

    // 1. Ignora file statici o API
    // Se contiene un punto (es. style.css) o inizia con api, passa oltre.
    if (slug.startsWith('api') || slug.includes('.')) return next();

    console.log(`🔍 SEO CHECK per slug: "${slug}"`);

    // 2. Determina il percorso di index.html
    let filePath = path.join(__dirname, '..', 'client', 'dist', 'index.html');
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, '..', 'client', 'index.html');
    }

    if (!fs.existsSync(filePath)) {
        console.error("❌ ERRORE CRITICO: index.html non trovato!");
        return next(); 
    }

    // Dati di Default (Fallback)
    let title = "Cosa e Dove Mangiare | Menu Digitale";
    let desc = "Scopri i migliori menu digitali e ordina online.";
    let image = `${DOMAIN}/logo-default.png`; 

    try {
        // 3. Recupera Dati Ristorante dal DB
        const result = await pool.query('SELECT nome, style FROM ristoranti WHERE slug = $1', [slug]);

        if (result.rows.length > 0) {
            const r = result.rows[0];
            const style = typeof r.style === 'string' ? JSON.parse(r.style) : (r.style || {});
            
            title = `${r.nome} | Menu Digitale`;
            desc = `Sfoglia il menu di ${r.nome} e ordina le tue specialità!`;
            
            // --- FIX URL IMMAGINI PER FACEBOOK ---
            // Facebook richiede URL assoluti (https://...). 
            // Se nel DB l'url è relativo (es: /uploads/foto.png), aggiungiamo il dominio.
            let rawImg = style.logo_url || style.cover_url;
            if (rawImg) {
                if (rawImg.startsWith('http')) {
                    image = rawImg;
                } else {
                    // Rimuovi eventuale slash iniziale doppio per sicurezza
                    image = `${DOMAIN}${rawImg.startsWith('/') ? '' : '/'}${rawImg}`;
                }
            }
            
            console.log(`✅ Ristorante trovato: "${title}" - IMG: ${image}`);
        } else {
            console.log(`⚠️ Ristorante non trovato per slug: ${slug}, uso dati default.`);
        }

        // 4. Leggi e Sostituisci (SINCRONO per evitare race conditions)
        let htmlData = fs.readFileSync(filePath, 'utf8');

        // Sostituzione globale
        htmlData = htmlData
            .replace(/__META_TITLE__/g, title)
            .replace(/__META_DESCRIPTION__/g, desc)
            .replace(/__META_IMAGE__/g, image);

        // Invia risposta definitiva
        res.status(200).send(htmlData);

    } catch (e) {
        console.error("❌ Errore SEO Injection:", e);
        
        // 5. EMERGENZA: Se c'è un errore nel DB, NON mandare il file rotto.
        // Manda comunque l'HTML ma con i tag di default puliti.
        try {
            let htmlData = fs.readFileSync(filePath, 'utf8');
            htmlData = htmlData
                .replace(/__META_TITLE__/g, "Cosa e Dove Mangiare")
                .replace(/__META_DESCRIPTION__/g, "Menu Digitale")
                .replace(/__META_IMAGE__/g, `${DOMAIN}/logo-default.png`);
            res.status(200).send(htmlData);
        } catch (err2) {
            next(); // Se fallisce anche la lettura file, passa al gestore standard
        }
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