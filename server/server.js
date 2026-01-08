// server/server.js - VERSIONE DEFINITIVA V48 (SENZA DUPLICATI)
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

if (!process.env.DATABASE_URL) { console.error("❌ ERRORE CRITICO: Manca DATABASE_URL"); process.exit(1); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// --- INIT DATABASE ---
const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️ AVVIO CONTROLLO DATABASE...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS ristoranti (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, ordini_abilitati BOOLEAN DEFAULT TRUE, servizio_attivo BOOLEAN DEFAULT TRUE, logo_url TEXT, cover_url TEXT, colore_sfondo TEXT DEFAULT '#222', colore_titolo TEXT DEFAULT '#fff', colore_testo TEXT DEFAULT '#ccc', colore_prezzo TEXT DEFAULT '#27ae60', font_style TEXT DEFAULT 'sans-serif', email TEXT, telefono TEXT, password TEXT DEFAULT 'tonystark');
            CREATE TABLE IF NOT EXISTS categorie (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), nome TEXT NOT NULL, descrizione TEXT, posizione INTEGER DEFAULT 0, is_bar BOOLEAN DEFAULT FALSE, is_pizzeria BOOLEAN DEFAULT FALSE);
            CREATE TABLE IF NOT EXISTS prodotti (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), categoria TEXT, sottocategoria TEXT, nome TEXT NOT NULL, descrizione TEXT, prezzo REAL, immagine_url TEXT, posizione INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS ordini (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), tavolo TEXT, stato TEXT DEFAULT 'in_attesa', data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP, prodotti TEXT, totale REAL, dettagli TEXT);
        `);
        // Colonne extra
        await client.query(`
            DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ristoranti' AND column_name='cucina_super_active') THEN ALTER TABLE ristoranti ADD COLUMN cucina_super_active BOOLEAN DEFAULT TRUE; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ristoranti' AND column_name='account_attivo') THEN ALTER TABLE ristoranti ADD COLUMN account_attivo BOOLEAN DEFAULT TRUE; END IF;
            END $$;
        `);
        console.log("✅ Database Pronto.");
        return true;
    } catch (err) { console.error("❌ Errore InitDB:", err); return false; } 
    finally { client.release(); }
};

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-pizzeria', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() });

// --- API PRINCIPALI ---

app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query(`SELECT * FROM ristoranti WHERE slug = $1`, [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        const data = rist.rows[0];
        
        const menu = await pool.query(`SELECT p.*, c.nome as categoria_nome, c.is_bar as categoria_is_bar, c.is_pizzeria as categoria_is_pizzeria, c.posizione as categoria_posizione FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY COALESCE(c.posizione, 999) ASC, p.posizione ASC`, [data.id]);
        
        const isAccountActive = data.account_attivo !== false; 
        const isSuperKitchenActive = data.cucina_super_active !== false;
        const isOwnerKitchenActive = data.ordini_abilitati;
        const canOrder = isAccountActive && isSuperKitchenActive && isOwnerKitchenActive;

        res.json({ 
            id: data.id, 
            ristorante: data.nome, 
            style: { logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, title: data.colore_titolo, text: data.colore_testo, price: data.colore_prezzo, font: data.font_style }, 
            subscription_active: isAccountActive, 
            kitchen_active: data.servizio_attivo, 
            ordini_abilitati: canOrder,
            menu: menu.rows 
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.get('/api/ristorante/config/:id', async (req, res) => { 
    try { const r = await pool.query('SELECT *, cucina_super_active FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } 
});

app.put('/api/ristorante/servizio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const check = await pool.query('SELECT account_attivo, cucina_super_active FROM ristoranti WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });

        const r = check.rows[0];
        if (r.account_attivo === false) return res.status(403).json({ error: "ABBONAMENTO SOSPESO." });
        if (req.body.ordini_abilitati === true && r.cucina_super_active === false) return res.status(403).json({ error: "BLOCCO AMMINISTRATIVO." });

        if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]);
        if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]);

        res.json({ success: true });
    } catch (e) { res.status(500).json({error:"Err"}); }
});

// --- API SUPER ADMIN ---
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { 
    try { 
        const { id } = req.params;
        if (req.body.account_attivo !== undefined) { await pool.query('UPDATE ristoranti SET account_attivo = $1 WHERE id = $2', [req.body.account_attivo, id]); return res.json({ success: true }); }
        if (req.body.cucina_super_active !== undefined) { await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]); return res.json({ success: true }); }
        if (req.body.servizio_attivo !== undefined) { await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]); return res.json({ success: true }); }
        if (req.body.ordini_abilitati !== undefined) { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]); return res.json({ success: true }); }
        
        let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; 
        let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; 
        if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } 
        await pool.query(sql, params); res.json({ success: true }); 
    } catch (e) { res.status(500).json({error: "Err"}); } 
});
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

// --- STANDARD API (PULITE E CORRETTE) ---
app.get('/api/polling/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND (stato IS NULL OR stato != 'pagato') ORDER BY data_ora ASC", [req.params.ristorante_id]); const ordini = r.rows.map(o => { let p=[]; try{p=JSON.parse(o.prodotti||"[]")}catch(e){} return {...o, prodotti:Array.isArray(p)?p:[]}; }); res.json({ nuovi_ordini: ordini }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/ordine/:id/update-items', async (req, res) => { try { const { id } = req.params; const { prodotti, totale, logMsg } = req.body; let q = "UPDATE ordini SET prodotti = $1"; const p = [JSON.stringify(prodotti)]; let i = 2; if(totale!==undefined){q+=`, totale=$${i}`;p.push(totale);i++} if(logMsg){q+=`, dettagli=COALESCE(dettagli,'')||$${i}`;p.push(`\n[${new Date().toLocaleString()}] ${logMsg}`);i++} q+=` WHERE id=$${i}`; p.push(id); await pool.query(q, p); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
app.post('/api/cassa/paga-tavolo', async (req, res) => { const c = await pool.connect(); try { await c.query('BEGIN'); const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [req.body.ristorante_id, String(req.body.tavolo)]); if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});} let tot=0, prod=[], log=""; r.rows.forEach(o=>{ tot+=Number(o.totale||0); let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} prod=[...prod, ...p]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; }); log+=`\nCHIUSO: ${tot}€`; await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); await c.query('COMMIT'); res.json({success:true}); } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} });
app.post('/api/ordine', async (req, res) => { try { const { ristorante_id, tavolo, prodotti, totale } = req.body; await pool.query("INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato) VALUES ($1, $2, $3, $4, 'in_attesa')", [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

// --- FIX CREAZIONE CATEGORIA (Calcola posizione corretta invece di 999) ---
app.post('/api/categorie', async (req, res) => { 
    try { 
        // 1. Trova l'ultimo numero usato
        const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [req.body.ristorante_id]); 
        // 2. Aggiunge 1
        const next = (max.rows[0].max || 0) + 1; 
        
        // 3. Salva con il numero corretto
        const r = await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
            [req.body.nome, next, req.body.ristorante_id, req.body.is_bar, req.body.is_pizzeria]
        ); 
        res.json(r.rows[0]); 
    } catch (e) { res.status(500).json({error:"Err"}); } 
});

app.put('/api/categorie/:id', async (req, res) => { try { await pool.query('UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3 WHERE id=$4', [req.body.nome, req.body.is_bar, req.body.is_pizzeria, req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({error:"Err"});} });
app.delete('/api/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id=$1', [req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({error:"Err"});} });

// --- FIX CREAZIONE PRODOTTI (Calcola posizione corretta invece di 999) ---
app.post('/api/prodotti', async (req, res) => { 
    try { 
        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [req.body.ristorante_id]);
        const next = (max.rows[0].max || 0) + 1;

        await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', 
            [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria, req.body.descrizione, req.body.ristorante_id, req.body.immagine_url, next]
        ); 
        res.json({success:true}); 
    } catch(e){res.status(500).json({error:"Err"});} 
});

app.put('/api/prodotti/:id', async (req, res) => { try { await pool.query('UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6 WHERE id=$7', [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria, req.body.descrizione, req.body.immagine_url, req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({error:"Err"});} });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({error:"Err"});} });
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id=$1 ORDER BY posizione', [req.params.ristorante_id]); res.json(r.rows); } catch(e){res.status(500).json({error:"Err"});} });

// LOGIN
app.post('/api/login', async (req, res) => { 
    try { 
        const r = await pool.query('SELECT * FROM ristoranti WHERE email=$1 AND password=$2', [req.body.email, req.body.password]); 
        if(r.rows.length>0) {
            if (r.rows[0].account_attivo === false) return res.status(403).json({success:false, error: "ABBONAMENTO SOSPESO"});
            res.json({success:true, user:r.rows[0]}); 
        } else res.status(401).json({success:false}); 
    } catch(e){res.status(500).json({error:"Err"});} 
});

app.put('/api/ristorante/style/:id', async (req, res) => { try { await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, font_style=$7 WHERE id=$8`, [req.body.logo_url, req.body.cover_url, req.body.colore_sfondo, req.body.colore_titolo, req.body.colore_testo, req.body.colore_prezzo, req.body.font_style, req.params.id]); res.json({success:true}); } catch(e){res.status(500).json({error:"Err"});} });
app.post('/api/upload', upload.single('photo'), (req,res)=>res.json({url:req.file.path}));
app.post('/api/ordine/completato', async (req, res) => { try { await pool.query("UPDATE ordini SET stato = 'servito' WHERE id = $1", [req.body.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.get('/api/reset-ordini', async (req, res) => { try { await pool.query('DELETE FROM ordini'); await pool.query('ALTER SEQUENCE ordini_id_seq RESTART WITH 1'); res.send("<h1>✅ TABULA RASA</h1>"); } catch (e) { res.status(500).send("Errore: " + e.message); } });

// --- GESTIONE EXCEL ---
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => { const { ristorante_id } = req.body; if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." }); try { const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const sheetName = workbook.SheetNames[0]; const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); for (const row of data) { const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome"; const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0; const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale"; const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : ""; const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : ""; let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]); if (catCheck.rows.length === 0) { const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', [categoria, (maxPos.rows[0].max||0)+1, ristorante_id, ""]); } await pool.query(`INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) VALUES ($1, $2, $3, $4, $5, $6, 999)`, [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id]); } res.json({ success: true, message: `Importati ${data.length} piatti!` }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/export-excel/:ristorante_id', async (req, res) => { try { const result = await pool.query(`SELECT nome as "Nome", prezzo as "Prezzo", categoria as "Categoria", sottocategoria as "Sottocategoria", descrizione as "Descrizione" FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome`, [req.params.ristorante_id]); const workbook = xlsx.utils.book_new(); const worksheet = xlsx.utils.json_to_sheet(result.rows); xlsx.utils.book_append_sheet(workbook, worksheet, "Menu"); const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Disposition', 'attachment; filename="menu_export.xlsx"'); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buffer); } catch (err) { res.status(500).json({ error: "Errore Export" }); } });

// --- FIX RIORDINAMENTO (Logica estratta dalla V33 funzionante) ---

// --- FIX RIORDINAMENTO (Logica V12 Funzionante) ---

// 1. RIORDINA CATEGORIE
app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body; 
    try {
        for (const cat of categorie) {
            // Aggiorna solo la posizione, semplice e diretto
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) { 
        console.error("Errore server categorie:", err);
        res.status(500).json({ error: "Errore durante il riordino categorie" }); 
    }
});

// 2. RIORDINA PRODOTTI
app.put('/api/prodotti/riordina', async (req, res) => {
    const { prodotti } = req.body; 
    try {
        for (const prod of prodotti) {
            if(prod.categoria) {
                // Se c'è la categoria nel payload, aggiorniamo anche quella (spostamento tra liste)
                await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', 
                    [prod.posizione, prod.categoria, prod.id]);
            } else {
                // Altrimenti solo la posizione (spostamento nella stessa lista)
                await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', 
                    [prod.posizione, prod.id]);
            }
        }
        res.json({ success: true });
    } catch (err) { 
        console.error("Errore server prodotti:", err);
        res.status(500).json({ error: "Errore durante il riordino prodotti" }); 
    }
});

initDb().then((ready) => { if (ready) app.listen(port, () => console.log(`🚀 SERVER V48 (FINAL) - Porta ${port}`)); });