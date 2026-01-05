// server/server.js - COMPLETO CON CATEGORIE E GERARCHIA 👑
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

// CLOUDINARY
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

// 1. MENU PUBBLICO (RESTITUISCE I DUE LIVELLI DI PERMESSO)
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT id, nome, ordini_abilitati, servizio_attivo FROM ristoranti WHERE slug = $1', [slug]);
        
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        
        const menu = await pool.query('SELECT * FROM prodotti WHERE ristorante_id = $1 ORDER BY id DESC', [rist.rows[0].id]);
        
        res.json({ 
            id: rist.rows[0].id, 
            ristorante: rist.rows[0].nome,
            ordini_abilitati: rist.rows[0].ordini_abilitati, 
            servizio_attivo: rist.rows[0].servizio_attivo,
            menu: menu.rows 
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// 2. ADMIN: OTTIENI STATO CONFIGURAZIONE
app.get('/api/ristorante/config/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT ordini_abilitati, servizio_attivo FROM ristoranti WHERE id = $1', [req.params.id]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// 3. ADMIN: CAMBIA IL SUO INTERRUTTORE (Toggle Servizio)
app.put('/api/ristorante/servizio/:id', async (req, res) => {
    const { id } = req.params;
    const { servizio_attivo } = req.body;
    try {
        await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [servizio_attivo, id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// 4. SUPER ADMIN: LISTA E MODIFICA PIANI
app.get('/api/super/ristoranti', async (req, res) => {
    try { const result = await pool.query('SELECT id, nome, slug, ordini_abilitati FROM ristoranti ORDER BY id ASC'); res.json(result.rows); } 
    catch (err) { res.status(500).json({ error: "Err" }); }
});
app.put('/api/super/ristoranti/:id', async (req, res) => {
    try { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, req.params.id]); res.json({ success: true }); } 
    catch (err) { res.status(500).json({ error: "Err" }); }
});

// --- NUOVE ROTTE CATEGORIE (IMPORTANTI PER IL DRAG & DROP) ---

// A. LEGGI CATEGORIE (Ordinate per posizione)
app.get('/api/categorie/:ristorante_id', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', 
            [req.params.ristorante_id]
        );
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// B. CREA CATEGORIA
app.post('/api/categorie', async (req, res) => {
    const { nome, ristorante_id } = req.body;
    try {
        const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (maxPos.rows[0].max || 0) + 1;
        
        const result = await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id) VALUES ($1, $2, $3) RETURNING *',
            [nome, nextPos, ristorante_id]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// C. RIORDINA CATEGORIE (Salvataggio Drag & Drop)
app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body; 
    try {
        for (const cat of categorie) {
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// D. CANCELLA CATEGORIA
app.delete('/api/categorie/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM categorie WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Err" }); }
});
// -------------------------------------------------------------

// LOGIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM ristoranti WHERE email_titolare = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) res.json({ success: true, user: result.rows[0] });
        else res.status(401).json({ success: false, error: "Credenziali errate" });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// UPLOAD FOTO
app.post('/api/upload', upload.single('photo'), async (req, res) => { try { res.json({ url: req.file.path }); } catch (e) { res.status(500).json({error:"Err"}); } });

// ORDINE (Ora accetta e invia ordini)
app.post('/api/ordine', async (req, res) => { 
    const { ristorante_id, tavolo, prodotti, totale } = req.body;
    try { await pool.query('INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale) VALUES ($1, $2, $3, $4)', [ristorante_id, tavolo, prodotti.join(", "), totale]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } 
});

// POLLING CUCINA
app.get('/api/polling/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'in_attesa' ORDER BY data_creazione ASC", [req.params.ristorante_id]); res.json({ nuovi_ordini: r.rows }); } catch (e) { res.status(500).send("Err"); } });

// ORDINE COMPLETATO
app.post('/api/ordine/completato', async (req, res) => { try { await pool.query("UPDATE ordini SET stato = 'completato' WHERE id = $1", [req.body.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });

// PRODOTTI (Creazione e Cancellazione)
app.post('/api/prodotti', async (req, res) => { const {nome,prezzo,categoria,ristorante_id,immagine_url} = req.body; try { await pool.query('INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id, immagine_url) VALUES ($1, $2, $3, $4, $5)', [nome, prezzo, categoria, ristorante_id, immagine_url||""]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

app.listen(port, () => console.log(`Server attivo sulla porta ${port}`));