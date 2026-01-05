// server/server.js - VERSIONE DEFINITIVA MULTI-RISTORANTE & FOTO 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// --- IMPORT PER LE FOTO ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// --- 1. CONFIGURAZIONE DATABASE ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- 2. CONFIGURAZIONE CLOUDINARY ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'menu-pizzeria',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp'],
  },
});
const upload = multer({ storage: storage });

// --- ROTTE ---

// A. UPLOAD FOTO
app.post('/api/upload', upload.single('photo'), async (req, res) => {
    try {
        res.json({ url: req.file.path });
    } catch (err) {
        console.error("Errore upload:", err);
        res.status(500).json({ error: "Errore caricamento foto" });
    }
});

// B. MENU PUBBLICO (RESTITUISCE ANCHE L'ID!)
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT id, nome FROM ristoranti WHERE slug = $1', [slug]);
        
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        
        const menu = await pool.query('SELECT * FROM prodotti WHERE ristorante_id = $1 ORDER BY id DESC', [rist.rows[0].id]);
        
        // MODIFICA CRUCIALE: Restituiamo anche l'ID!
        res.json({ 
            id: rist.rows[0].id, 
            ristorante: rist.rows[0].nome, 
            menu: menu.rows 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// C. INVIO ORDINE (MULTI-RISTORANTE)
app.post('/api/ordine', async (req, res) => {
    // Ora ci aspettiamo che il frontend ci mandi l'ID del ristorante corretto
    const { ristorante_id, tavolo, prodotti, totale } = req.body;
    
    try {
        const dettagli = prodotti.join(", ");
        
        await pool.query(
            `INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale)
             VALUES ($1, $2, $3, $4)`,
            [ristorante_id, tavolo, dettagli, totale]
        );

        console.log(`✅ Ordine ricevuto per Ristorante ID ${ristorante_id}`);
        res.json({ success: true });
    } catch (err) {
        console.error("❌ Errore ordine:", err);
        res.status(500).json({ error: "Errore database" });
    }
});

// D. POLLING CUCINA (SCARICA ORDINI DI UN RISTORANTE SPECIFICO)
app.get('/api/polling/:ristorante_id', async (req, res) => {
    const { ristorante_id } = req.params;
    try {
        const result = await pool.query(
            `SELECT * FROM ordini 
             WHERE ristorante_id = $1 AND stato = 'in_attesa' 
             ORDER BY data_creazione ASC`, 
            [ristorante_id]
        );
        res.json({ nuovi_ordini: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Errore server");
    }
});

// E. COMPLETA ORDINE
app.post('/api/ordine/completato', async (req, res) => {
    const { id } = req.body;
    try {
        await pool.query("UPDATE ordini SET stato = 'completato' WHERE id = $1", [id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore aggiornamento" });
    }
});

// F. LOGIN ADMIN
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM ristoranti WHERE email_titolare = $1 AND password = $2', [email, password]);
        if (result.rows.length > 0) {
            res.json({ success: true, user: result.rows[0] });
        } else {
            res.status(401).json({ success: false, error: "Credenziali errate" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// G. AGGIUNGI PRODOTTO (CON FOTO)
app.post('/api/prodotti', async (req, res) => {
    const { nome, prezzo, categoria, ristorante_id, immagine_url } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, ristorante_id, immagine_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome, prezzo, categoria, ristorante_id, immagine_url || ""]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore inserimento" });
    }
});

// H. CANCELLA PRODOTTO
app.delete('/api/prodotti/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Errore cancellazione" });
    }
});

app.listen(port, () => console.log(`Server attivo sulla porta ${port}`));