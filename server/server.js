// server/server.js - VERSIONE COMPLETA (EXCEL + DRAG&DROP + SOTTOCATEGORIE) 🚀
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const xlsx = require('xlsx'); // Assicurati di aver fatto 'npm install xlsx'

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// CLOUDINARY CONFIG (Per le FOTO)
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

// MULTER MEMORY (Per i file EXCEL)
const uploadFile = multer({ storage: multer.memoryStorage() });

// --- ROTTE ---

// 1. MENU PUBBLICO
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT id, nome, ordini_abilitati, servizio_attivo FROM ristoranti WHERE slug = $1', [slug]);
        
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        const ristID = rist.rows[0].id;

        // Selezioniamo tutto, inclusa descrizione categoria e sottocategoria
        const query = `
            SELECT p.*, c.descrizione as categoria_descrizione 
            FROM prodotti p
            LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id
            WHERE p.ristorante_id = $1
            ORDER BY COALESCE(c.posizione, 999) ASC, p.posizione ASC
        `;
        
        const menu = await pool.query(query, [ristID]);
        
        res.json({ 
            id: ristID, 
            ristorante: rist.rows[0].nome,
            ordini_abilitati: rist.rows[0].ordini_abilitati, 
            servizio_attivo: rist.rows[0].servizio_attivo,
            menu: menu.rows 
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// 2. EXCEL IMPORT 📥
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." });

    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        console.log("Importazione Excel avviata. Righe:", data.length);

        for (const row of data) {
            // Leggiamo i dati rispettando le Maiuscole delle intestazioni Excel
            const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome";
            const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0;
            const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale";
            const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : "";
            const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : "";

            // A. Gestione Categoria
            let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
                await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', [categoria, (maxPos.rows[0].max||0)+1, ristorante_id, ""]);
            }

            // B. Inserimento Prodotto
            await pool.query(
                `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) 
                 VALUES ($1, $2, $3, $4, $5, $6, 999)`,
                [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id]
            );
        }

        res.json({ success: true, message: `Importati ${data.length} piatti!` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Errore Import: " + err.message });
    }
});

// 3. EXCEL EXPORT 📤 (QUESTA È QUELLA CHE TI MANCAVA!)
app.get('/api/export-excel/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        
        // Scarichiamo i dati con i nomi delle colonne GIUSTI per l'Excel
        const result = await pool.query(`
            SELECT 
                nome as "Nome", 
                prezzo as "Prezzo", 
                categoria as "Categoria", 
                sottocategoria as "Sottocategoria", 
                descrizione as "Descrizione" 
            FROM prodotti 
            WHERE ristorante_id = $1 
            ORDER BY categoria, nome
        `, [ristorante_id]);
        
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Menu");
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename="menu_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
        
    } catch (err) { 
        console.error(err);
        res.status(500).json({ error: "Errore Export" }); 
    }
});

// 4. CREA PRODOTTO (Manuale)
app.post('/api/prodotti', async (req, res) => { 
    try { 
        await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, 999)', 
            [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.ristorante_id, req.body.immagine_url||""]
        ); 
        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
});

// 5. RIORDINA PRODOTTI (Drag & Drop)
app.put('/api/prodotti/riordina', async (req, res) => {
    const { prodotti } = req.body; 
    try {
        for (const prod of prodotti) {
            // Aggiorniamo posizione e categoria
            if(prod.categoria) {
                await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]);
            } else {
                await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Err" }); }
});

// --- ALTRE ROTTE STANDARD ---
app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body; 
    try {
        for (const cat of categorie) {
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Err" }); }
});
app.get('/api/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT ordini_abilitati, servizio_attivo FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/ristorante/servizio/:id', async (req, res) => { try { await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/categorie', async (req, res) => { try { const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [req.body.ristorante_id]); const next = (max.rows[0].max || 0) + 1; const r = await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.nome, next, req.body.ristorante_id, req.body.descrizione||""]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.delete('/api/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT id, nome, slug, ordini_abilitati FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/login', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE email_titolare = $1 AND password = $2', [req.body.email, req.body.password]); if(r.rows.length>0) res.json({success:true, user:r.rows[0]}); else res.status(401).json({success:false}); } catch(e){res.status(500).json({error:"Err"});} });
app.post('/api/upload', upload.single('photo'), async (req, res) => { try { res.json({ url: req.file.path }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/ordine', async (req, res) => { try { await pool.query('INSERT INTO ordini (ristorante_id, tavolo, dettagli, prezzo_totale) VALUES ($1, $2, $3, $4)', [req.body.ristorante_id, req.body.tavolo, req.body.prodotti.join(", "), req.body.totale]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.get('/api/polling/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'in_attesa' ORDER BY data_creazione ASC", [req.params.ristorante_id]); res.json({ nuovi_ordini: r.rows }); } catch (e) { res.status(500).send("Err"); } });
app.post('/api/ordine/completato', async (req, res) => { try { await pool.query("UPDATE ordini SET stato = 'completato' WHERE id = $1", [req.body.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

app.listen(port, () => console.log(`Server attivo sulla porta ${port}`));