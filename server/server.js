// server/server.js - VERSIONE "TABULA RASA" (FIX DEFINITIVO 999 & RIORDINO)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const xlsx = require('xlsx');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// CONFIGURAZIONE DATABASE
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE: Manca DATABASE_URL nel file .env");
    process.exit(1);
}
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// CONFIGURAZIONE CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-app' } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() });

// --- API CATEGORIE (FIXATE) ---

// 1. CREA CATEGORIA (Calcola posizione corretta invece di 999)
app.post('/api/categorie', async (req, res) => {
    try {
        const { nome, ristorante_id, is_bar, is_pizzeria, descrizione } = req.body;
        
        // Calcoliamo il prossimo numero disponibile
        const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;

        const r = await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria, descrizione) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, nextPos, ristorante_id, is_bar || false, is_pizzeria || false, descrizione || ""]
        );
        res.json(r.rows[0]);
    } catch (e) {
        console.error("Errore creazione categoria:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. RIORDINA CATEGORIE (Versione semplice e robusta)
app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body;
    try {
        if (!categorie || !Array.isArray(categorie)) throw new Error("Dati non validi");
        
        for (const cat of categorie) {
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Errore riordino categorie:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. LEGGI CATEGORIE
app.get('/api/categorie/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Errore server" }); }
});

// 4. MODIFICA/ELIMINA CATEGORIA
app.put('/api/categorie/:id', async (req, res) => {
    try {
        await pool.query('UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3, descrizione=$4 WHERE id=$5', 
            [req.body.nome, req.body.is_bar, req.body.is_pizzeria, req.body.descrizione, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
app.delete('/api/categorie/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categorie WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});


// --- API PRODOTTI (FIXATE) ---

// 1. CREA PRODOTTO (Calcola posizione corretta invece di 999)
app.post('/api/prodotti', async (req, res) => {
    try {
        const { nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url } = req.body;
        
        // Calcoliamo il prossimo numero
        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;

        await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
            [nome, prezzo, categoria, sottocategoria || "", descrizione || "", ristorante_id, immagine_url || "", nextPos]
        );
        res.json({ success: true });
    } catch (e) {
        console.error("Errore creazione prodotto:", e);
        res.status(500).json({ error: e.message });
    }
});

// 2. RIORDINA PRODOTTI
app.put('/api/prodotti/riordina', async (req, res) => {
    const { prodotti } = req.body;
    try {
        if (!prodotti || !Array.isArray(prodotti)) throw new Error("Dati non validi");

        for (const prod of prodotti) {
            if (prod.categoria) {
                // Se cambia categoria
                await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', 
                    [prod.posizione, prod.categoria, prod.id]);
            } else {
                // Solo posizione
                await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', 
                    [prod.posizione, prod.id]);
            }
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Errore riordino prodotti:", err);
        res.status(500).json({ error: err.message });
    }
});

// 3. ALTRE API PRODOTTI
app.put('/api/prodotti/:id', async (req, res) => {
    try {
        await pool.query('UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6 WHERE id=$7', 
            [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria, req.body.descrizione, req.body.immagine_url, req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
app.delete('/api/prodotti/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});


// --- API GENERICHE ---
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Non trovato" });
        
        const data = rist.rows[0];
        const menu = await pool.query(`
            SELECT p.*, c.is_bar, c.is_pizzeria 
            FROM prodotti p 
            LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id 
            WHERE p.ristorante_id = $1 
            ORDER BY c.posizione ASC, p.posizione ASC
        `, [data.id]);
        
        res.json({
            id: data.id,
            ristorante: data.nome,
            style: { logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, title: data.colore_titolo, text: data.colore_testo, price: data.colore_prezzo, font: data.font_style },
            subscription_active: data.account_attivo !== false,
            kitchen_active: data.cucina_super_active !== false,
            ordini_abilitati: data.ordini_abilitati,
            menu: menu.rows
        });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM ristoranti WHERE email=$1 AND password=$2', [req.body.email, req.body.password]);
        if (r.rows.length > 0) res.json({ success: true, user: r.rows[0] });
        else res.status(401).json({ success: false });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.get('/api/polling/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato != 'pagato' ORDER BY data_ora ASC", [req.params.ristorante_id]);
        const ordini = r.rows.map(o => {
            try { return { ...o, prodotti: JSON.parse(o.prodotti) }; } 
            catch { return { ...o, prodotti: [] }; }
        });
        res.json({ nuovi_ordini: ordini });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.post('/api/ordine', async (req, res) => {
    try {
        await pool.query("INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato) VALUES ($1, $2, $3, $4, 'in_attesa')", 
            [req.body.ristorante_id, String(req.body.tavolo), JSON.stringify(req.body.prodotti), req.body.totale]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));

app.listen(port, () => console.log(`🚀 SERVER CORRETTO (Porta ${port})`));