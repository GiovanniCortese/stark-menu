// server/server.js - VERSIONE V17 (FIX CUCINA + CODICE COMPLETO) 🛡️
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

// Verifica configurazione critica
if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE CRITICO: Manca la variabile d'ambiente DATABASE_URL");
    process.exit(1); 
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- INIT DB & MIGRAZIONI (SAFE MODE) ---
const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️ Verifica struttura Database in corso...");
        
        // 1. CREAZIONE TABELLE BASE (SE NON ESISTONO)
        await client.query(`
            CREATE TABLE IF NOT EXISTS ristoranti (
                id SERIAL PRIMARY KEY,
                nome TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                ordini_abilitati BOOLEAN DEFAULT FALSE,
                servizio_attivo BOOLEAN DEFAULT FALSE,
                logo_url TEXT, cover_url TEXT,
                colore_sfondo TEXT DEFAULT '#222222',
                colore_titolo TEXT DEFAULT '#ffffff',
                colore_testo TEXT DEFAULT '#cccccc',
                colore_prezzo TEXT DEFAULT '#27ae60',
                font_style TEXT DEFAULT 'sans-serif'
            );
            CREATE TABLE IF NOT EXISTS categorie (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER REFERENCES ristoranti(id),
                nome TEXT NOT NULL,
                descrizione TEXT,
                posizione INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS prodotti (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER REFERENCES ristoranti(id),
                categoria TEXT,
                sottocategoria TEXT,
                nome TEXT NOT NULL,
                descrizione TEXT,
                prezzo REAL,
                immagine_url TEXT,
                posizione INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS ordini (
                id SERIAL PRIMARY KEY,
                ristorante_id INTEGER REFERENCES ristoranti(id),
                tavolo TEXT,
                stato TEXT DEFAULT 'in attesa',
                data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. MIGRAZIONE COLONNE MANCANTI (AUTO-REPAIR SICURO)
        await client.query(`
            DO $$ 
            BEGIN 
                -- Ristoranti
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ristoranti' AND column_name='email') THEN ALTER TABLE ristoranti ADD COLUMN email TEXT; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ristoranti' AND column_name='telefono') THEN ALTER TABLE ristoranti ADD COLUMN telefono TEXT; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ristoranti' AND column_name='password') THEN ALTER TABLE ristoranti ADD COLUMN password TEXT DEFAULT 'tonystark'; END IF;
                
                -- Ordini (IMPORTANTE)
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='prodotti') THEN ALTER TABLE ordini ADD COLUMN prodotti TEXT; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='totale') THEN ALTER TABLE ordini ADD COLUMN totale REAL; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='dettagli') THEN ALTER TABLE ordini ADD COLUMN dettagli TEXT; END IF;
            END $$;
        `);
        
        console.log("✅ Database verificato e pronto. Avvio server...");
        return true;
    } catch (err) {
        console.error("❌ Errore critico InitDB:", err);
        return false;
    } finally {
        client.release();
    }
};

// --- CLOUDINARY ---
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
const uploadFile = multer({ storage: multer.memoryStorage() });

// ==========================================
//                  ROTTE API
// ==========================================

// 1. MENU PUBBLICO
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query(`SELECT id, nome, ordini_abilitati, servizio_attivo, logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style FROM ristoranti WHERE slug = $1`, [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        const data = rist.rows[0];
        const menu = await pool.query(`SELECT p.*, c.descrizione as categoria_descrizione FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY COALESCE(c.posizione, 999) ASC, p.posizione ASC`, [data.id]);
        res.json({ 
            id: data.id, restaurante: data.nome,
            style: { logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, title: data.colore_titolo, text: data.colore_testo, price: data.colore_prezzo, font: data.font_style },
            ordini_abilitati: data.ordini_abilitati, servizio_attivo: data.servizio_attivo, menu: menu.rows 
        });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// 2. STILE
app.put('/api/ristorante/style/:id', async (req, res) => {
    try {
        const { logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style } = req.body;
        await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, font_style=$7 WHERE id=$8`, [logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style, req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Errore stile" }); }
});

// 3. CONFIG
app.get('/api/ristorante/config/:id', async (req, res) => { 
    try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } 
});

// 4. IMPORT EXCEL
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." });
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        for (const row of data) {
            const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome";
            const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0;
            const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale";
            const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : "";
            const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : "";
            let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
                await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', [categoria, (maxPos.rows[0].max||0)+1, ristorante_id, ""]);
            }
            await pool.query(`INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) VALUES ($1, $2, $3, $4, $5, $6, 999)`, [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id]);
        }
        res.json({ success: true, message: `Importati ${data.length} piatti!` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. EXPORT EXCEL
app.get('/api/export-excel/:ristorante_id', async (req, res) => {
    try {
        const result = await pool.query(`SELECT nome as "Nome", prezzo as "Prezzo", categoria as "Categoria", sottocategoria as "Sottocategoria", descrizione as "Descrizione" FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome`, [req.params.ristorante_id]);
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(result.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Menu");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="menu_export.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { res.status(500).json({ error: "Errore Export" }); }
});

// CRUD PRODOTTI
app.post('/api/prodotti', async (req, res) => { try { await pool.query('INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, 999)', [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.ristorante_id, req.body.immagine_url||""]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
app.put('/api/prodotti/:id', async (req, res) => { try { await pool.query(`UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6 WHERE id=$7`, [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.immagine_url||"", req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Errore aggiornamento" }); } });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/prodotti/riordina', async (req, res) => { const { prodotti } = req.body; try { for (const prod of prodotti) { if(prod.categoria) await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]); else await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });

// CRUD CATEGORIE
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/categorie', async (req, res) => { try { const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [req.body.ristorante_id]); const next = (max.rows[0].max || 0) + 1; const r = await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4) RETURNING *', [req.body.nome, next, req.body.ristorante_id, req.body.descrizione||""]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/categorie/:id', async (req, res) => { try { const { id } = req.params; const { nome, descrizione } = req.body; const oldCat = await pool.query('SELECT nome, ristorante_id FROM categorie WHERE id = $1', [id]); if (oldCat.rows.length > 0) { const oldName = oldCat.rows[0].nome; const ristId = oldCat.rows[0].ristorante_id; await pool.query('UPDATE categorie SET nome = $1, descrizione = $2 WHERE id = $3', [nome, descrizione || "", id]); if (oldName !== nome) { await pool.query('UPDATE prodotti SET categoria = $1 WHERE categoria = $2 AND ristorante_id = $3', [nome, oldName, ristId]); } } res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Errore update" }); } });
app.delete('/api/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/categorie/riordina', async (req, res) => { const { categorie } = req.body; try { for (const cat of categorie) await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });

// SERVIZIO & LOGIN
app.put('/api/ristorante/servizio/:id', async (req, res) => { try { await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/login', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE email = $1 AND password = $2', [req.body.email, req.body.password]); if(r.rows.length>0) res.json({success:true, user:r.rows[0]}); else res.status(401).json({success:false}); } catch(e){res.status(500).json({error:"Err"});} });
app.post('/api/upload', upload.single('photo'), async (req, res) => { try { res.json({ url: req.file.path }); } catch (e) { res.status(500).json({error:"Err"}); } });

// --- GESTIONE ORDINI (FIX V17) ---
app.post('/api/ordine', async (req, res) => { 
    try { 
        console.log("➡️ RICEVUTO ORDINE:", req.body);
        const { ristorante_id, tavolo, prodotti, totale } = req.body;
        
        // Validazione
        if (!ristorante_id || !prodotti || !tavolo) {
            console.error("❌ Dati mancanti nell'ordine");
            return res.status(400).json({ error: "Dati incompleti" });
        }

        const prodottiStr = JSON.stringify(prodotti);
        
        await pool.query(
            'INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale) VALUES ($1, $2, $3, $4)', 
            [ristorante_id, tavolo, prodottiStr, totale]
        ); 
        console.log("✅ Ordine Salvato!");
        res.json({ success: true }); 
    } catch (e) { 
        console.error("❌ Errore Ordine:", e);
        res.status(500).json({error: "Errore interno server"}); 
    } 
});

// API POLLING (Questa è quella che la cucina chiama)
app.get('/api/polling/:ristorante_id', async (req, res) => { 
    try { 
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'in attesa' ORDER BY id ASC", [req.params.ristorante_id]); 
        
        // TRASFORMAZIONE DATI (Fondamentale per far vedere gli ordini)
        const ordini = r.rows.map(o => {
            let parsedProdotti = [];
            
            if (Array.isArray(o.prodotti)) {
                parsedProdotti = o.prodotti;
            } else if (typeof o.prodotti === 'string') {
                try {
                    parsedProdotti = JSON.parse(o.prodotti);
                } catch (e) {
                    parsedProdotti = [{ nome: o.prodotti }];
                }
            } else if (o.dettagli) {
                // Fallback vecchia colonna
                parsedProdotti = [{ nome: o.dettagli }];
            }

            return { ...o, prodotti: parsedProdotti };
        });
        
        res.json({ nuovi_ordini: ordini }); 
    } catch (e) { 
        console.error("Errore Polling:", e);
        res.status(500).send("Err"); 
    } 
});

app.post('/api/ordine/completato', async (req, res) => { 
    try { 
        await pool.query("UPDATE ordini SET stato = 'completato' WHERE id = $1", [req.body.id]); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({error:"Err"}); } 
});

// SUPER ADMIN
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT id, nome, slug, ordini_abilitati, email, telefono FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { const { nome, slug, email, telefono, password } = req.body; const passFinale = password && password.trim() !== '' ? password : 'tonystark'; try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, ordini_abilitati) VALUES ($1, $2, $3, $4, $5, TRUE)`, [nome, slug, email || '', telefono || '', passFinale]); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({error: "Errore Creazione"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { const { id } = req.params; const body = req.body; try { if (body.ordini_abilitati !== undefined && Object.keys(body).length === 1) { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [body.ordini_abilitati, id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [body.nome, body.slug, body.email, body.telefono]; if (body.password && body.password.trim() !== "") { sql += ", password=$5 WHERE id=$6"; params.push(body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Errore Aggiornamento"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { const { id } = req.params; try { await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Errore Eliminazione"}); } });

// --- AVVIO SERVER SINCRONIZZATO (SAFE BOOT) ---
initDb().then((ready) => {
    if (ready) {
        app.listen(port, () => console.log(`🚀 SERVER V17 AVVIATO SU PORTA ${port}`));
    } else {
        console.error("❌ Impossibile avviare il server.");
    }
});