// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Configurazione Cloudinary (uguale a prima)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'menu-pizzeria', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] },
});
const upload = multer({ storage: storage });

// --- ROTTE ---

// 1. SUPER ADMIN: LISTA RISTORANTI
app.get('/api/super/ristoranti', async (req, res) => {
    try {
        // Restituisce tutti i ristoranti e le loro impostazioni
        const result = await pool.query('SELECT id, nome, slug, ordini_abilitati FROM ristoranti ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: "Errore server" });
    }
});

// 2. SUPER ADMIN: CAMBIA IMPOSTAZIONI (Toggle)
app.put('/api/super/ristoranti/:id', async (req, res) => {
    const { id } = req.params;
    const { ordini_abilitati } = req.body; // Ci aspettiamo true o false
    try {
        await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [ordini_abilitati, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore aggiornamento" });
    }
});

// UPLOAD FOTO
app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try { res.json({ url: req.file.path }); } 
    catch (err) { res.status(500).json({ error: "Errore foto" }); }
});

// MENU PUBBLICO (MODIFICATO: Ora invia anche ordini_abilitati)
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        // Selezioniamo anche 'ordini_abilitati'
        const rist = await pool.query('SELECT id, nome, ordini_abilitati FROM ristoranti WHERE slug = $1', [slug]);
        
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        
        const menu = await pool.query('SELECT * FROM prodotti WHERE ristorante_id = $1 ORDER BY id DESC', [rist.rows[0].id]);
        
        res.json({ 
            id: rist.rows[0].id, 
            ristorante: rist.rows[0].nome,
            ordini_abilitati: rist.rows[0].ordini_abilitati, // <--- FONDAMENTALE
            menu: menu.rows 
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// ... (LE ALTRE ROTTE: Login, Ordine, Polling, Prodotti rimangono uguali a prima)
// Per brevità non le riscrivo tutte, ma tu lascia quelle che avevi per:
// /api/ordine, /api/polling, /api/login, /api/prodotti 

// RIMETTI QUI SOTTO LE ALTRE ROTTE CHE AVEVI GIA' (copia dal file precedente se serve)
// Login, Ordine, Polling, Prodotti...

// INVIO ORDINE
app.post('/api/ordine', async (req, res) => {
    const { ristorante_id, tavolo, prodotti, totale } = req.body;
    try {
        const dettagli = prodotti.join(", ");
        await pool.query('INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale) VALUES ($1, $2, $3, $4)', [ristorante_id, tavolo, dettagli, totale]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Errore DB" }); }
});

// POLLING
app.get('/api/polling/:ristorante_id', async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'in_attesa' ORDER BY data_creazione ASC", [req.params.ristorante_id]);
        res.json({ nuovi_ordini: result.rows });
    } catch (err) { res.status(500).send("Err"); }
});

// COMPLETATO
app.post('/api/ordine/completato', async (req, res) => {
    try { await pool.query("UPDATE ordini SET stato = 'completato' WHERE id = $1", [req.body.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Err" }); }
});

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM ristoranti WHERE email_titolare = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
        else res.status(401).json({ success: false, error: "Credenziali errate" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// PRODOTTI (POST e DELETE)
app.post('/api/prodotti', async (req, res) => {
    const { nome, prezzo, categoria, ristorante_id, immagine_url } = req.body;
    try {
        const result = await pool.query('INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id, immagine_url) VALUES ($1, $2, $3, $4, $5) RETURNING *', [nome, prezzo, categoria, ristorante_id, immagine_url || ""]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Err" }); }
});
app.delete('/api/prodotti/:id', async (req, res) => {
    try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Err" }); }
});

app.listen(port, () => console.log(`Server attivo sulla porta ${port}`));