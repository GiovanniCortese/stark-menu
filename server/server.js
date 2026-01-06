// server/server.js - VERSIONE V31 (LOG + TOTALE DINAMICO) 🛠️
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

// --- SISTEMA DI AUTO-RIPARAZIONE ---
const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️ AVVIO CONTROLLO DATABASE (V31)...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS ristoranti (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, ordini_abilitati BOOLEAN DEFAULT FALSE, servizio_attivo BOOLEAN DEFAULT FALSE, logo_url TEXT, cover_url TEXT, colore_sfondo TEXT DEFAULT '#222', colore_titolo TEXT DEFAULT '#fff', colore_testo TEXT DEFAULT '#ccc', colore_prezzo TEXT DEFAULT '#27ae60', font_style TEXT DEFAULT 'sans-serif', email TEXT, telefono TEXT, password TEXT DEFAULT 'tonystark');
            CREATE TABLE IF NOT EXISTS categorie (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), nome TEXT NOT NULL, descrizione TEXT, posizione INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS prodotti (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), categoria TEXT, sottocategoria TEXT, nome TEXT NOT NULL, descrizione TEXT, prezzo REAL, immagine_url TEXT, posizione INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS ordini (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), tavolo TEXT, stato TEXT DEFAULT 'in_attesa', data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP, prodotti TEXT, totale REAL, dettagli TEXT);
        `);
        await client.query(`
            DO $$ BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categorie' AND column_name='is_bar') THEN ALTER TABLE categorie ADD COLUMN is_bar BOOLEAN DEFAULT FALSE; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='stato') THEN ALTER TABLE ordini ADD COLUMN stato TEXT DEFAULT 'in_attesa'; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='prodotti') THEN ALTER TABLE ordini ADD COLUMN prodotti TEXT DEFAULT '[]'; ELSE ALTER TABLE ordini ALTER COLUMN prodotti SET DEFAULT '[]'; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='totale') THEN ALTER TABLE ordini ADD COLUMN totale REAL DEFAULT 0; END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ordini' AND column_name='dettagli') THEN ALTER TABLE ordini ADD COLUMN dettagli TEXT; END IF;
            END $$;
        `);
        console.log("✅ Database V31 Pronto.");
        return true;
    } catch (err) { console.error("❌ Errore InitDB:", err); return false; } 
    finally { client.release(); }
};

cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-pizzeria', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() });

// --- API ---

// 1. MENU
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query(`SELECT * FROM ristoranti WHERE slug = $1`, [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        const data = rist.rows[0];
        const menu = await pool.query(`SELECT p.*, c.nome as categoria_nome, c.is_bar as categoria_is_bar, c.posizione as categoria_posizione FROM prodotti p LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id WHERE p.ristorante_id = $1 ORDER BY COALESCE(c.posizione, 999) ASC, p.posizione ASC`, [data.id]);
        res.json({ 
            id: data.id, 
            ristorante: data.nome, 
            style: { 
                logo: data.logo_url, 
                cover: data.cover_url, 
                bg: data.colore_sfondo,
                title: data.colore_titolo, // <--- MANCAVA QUESTO
                text: data.colore_testo,   // <--- MANCAVA QUESTO
                price: data.colore_prezzo, // <--- MANCAVA QUESTO
                font: data.font_style      // <--- MANCAVA QUESTO
            }, 
            ordini_abilitati: data.ordini_abilitati, 
            servizio_attivo: data.servizio_attivo, 
            menu: menu.rows 
        });
    } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// 2. POLLING AVANZATO
app.get('/api/polling/:ristorante_id', async (req, res) => { 
    try { 
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND (stato IS NULL OR stato != 'pagato') ORDER BY data_ora ASC", [req.params.ristorante_id]); 
        const ordini = r.rows.map(o => {
            let parsed = [];
            try { parsed = typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti; } catch (e) { parsed = []; }
            if (!Array.isArray(parsed)) parsed = [];
            
            // Assicura ID univoci per gestione singola
            parsed = parsed.map((item, idx) => ({
                ...item,
                uniqId: item.uniqId || `${o.id}_${idx}_${Date.now()}`,
                stato: item.stato || 'in_attesa'
            }));

            return { ...o, prodotti: parsed };
        });
        res.json({ nuovi_ordini: ordini }); 
    } catch (e) { res.status(500).json({ error: "Errore Polling", details: e.message }); } 
});

// 3. UPDATE ITEMS (AGGIORNATO: Gestisce totale e log)
app.put('/api/ordine/:id/update-items', async (req, res) => {
    try {
        const { id } = req.params;
        const { prodotti, totale, logMsg } = req.body; 
        
        const prodottiStr = JSON.stringify(prodotti);
        
        // Costruzione query dinamica per aggiornare anche il totale se serve
        let query = "UPDATE ordini SET prodotti = $1";
        const params = [prodottiStr];
        let paramIndex = 2;

        if (totale !== undefined) {
            query += `, totale = $${paramIndex}`;
            params.push(totale);
            paramIndex++;
        }

        // Aggiunge log allo storico dell'ordine
        if (logMsg) {
            const timestamp = new Date().toLocaleString('it-IT');
            const logEntry = `\n[${timestamp}] ${logMsg}`;
            query += `, dettagli = COALESCE(dettagli, '') || $${paramIndex}`;
            params.push(logEntry);
            paramIndex++;
        }

        query += ` WHERE id = $${paramIndex}`;
        params.push(id);

        await pool.query(query, params);
        res.json({ success: true });
    } catch (e) { 
        console.error("Errore Update:", e);
        res.status(500).json({ error: "Errore Update Items" }); 
    }
});

// 4. PAGAMENTO
app.post('/api/cassa/paga-tavolo', async (req, res) => {
    try {
        const { ristorante_id, tavolo } = req.body;
        const logMsg = `\n[${new Date().toLocaleString('it-IT')}] CONTO CHIUSO E PAGATO.`;
        await pool.query(
            "UPDATE ordini SET stato = 'pagato', dettagli = COALESCE(dettagli, '') || $3 WHERE ristorante_id = $1 AND tavolo = $2 AND stato != 'pagato'", 
            [ristorante_id, String(tavolo), logMsg]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore Pagamento" }); }
});

// 5. STORICO (Con log e limite aumentato)
app.get('/api/cassa/storico/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 300", [req.params.ristorante_id]);
        const ordini = r.rows.map(o => {
            let parsed = []; try { parsed = JSON.parse(o.prodotti||"[]"); } catch(e){}
            return { ...o, prodotti: Array.isArray(parsed)?parsed:[] };
        });
        res.json(ordini);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// 6. CREAZIONE ORDINE
app.post('/api/ordine', async (req, res) => { 
    try { 
        const { ristorante_id, tavolo, prodotti, totale } = req.body; 
        const prodottiArricchiti = (prodotti||[]).map((p, i) => ({ ...p, uniqId: `new_${Date.now()}_${i}`, stato: 'in_attesa' }));
        const prodottiStr = JSON.stringify(prodottiArricchiti); 
        const logMsg = `[${new Date().toLocaleString('it-IT')}] Ordine creato: ${prodottiArricchiti.length} elementi. Tot: ${totale}€`;
        
        await pool.query("INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli) VALUES ($1, $2, $3, $4, 'in_attesa', $5)", 
            [ristorante_id, String(tavolo), prodottiStr, totale, logMsg]); 
        res.json({ success: true }); 
    } catch (e) { console.error(e); res.status(500).json({error: "Err"}); } 
});

// API CATEGORIE (FIX RIORDINO ADMIN)
app.put('/api/categorie/riordina', async (req, res) => { 
    const { categorie } = req.body; 
    try { 
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            for (const cat of categorie) {
                await client.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]); 
            }
            await client.query('COMMIT');
            res.json({ success: true }); 
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) { 
        console.error("Errore riordino:", err);
        res.status(500).json({ error: "Err Ord Cat" }); 
    } 
});

// ALTRE API STANDARD
app.post('/api/login', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE email = $1 AND password = $2', [req.body.email, req.body.password]); if(r.rows.length>0) res.json({success:true, user:r.rows[0]}); else res.status(401).json({success:false}); } catch(e){res.status(500).json({error:"Err"});} });
app.put('/api/ristorante/style/:id', async (req, res) => { try { await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, font_style=$7 WHERE id=$8`, [req.body.logo_url, req.body.cover_url, req.body.colore_sfondo, req.body.colore_titolo, req.body.colore_testo, req.body.colore_prezzo, req.body.font_style, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.get('/api/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/categorie', async (req, res) => { try { const { nome, ristorante_id, descrizione, is_bar } = req.body; const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); const next = (max.rows[0].max || 0) + 1; const r = await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, is_bar) VALUES ($1, $2, $3, $4, $5) RETURNING *', [nome, next, ristorante_id, descrizione||"", is_bar || false]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/categorie/:id', async (req, res) => { try { await pool.query('UPDATE categorie SET nome = $1, descrizione = $2, is_bar = $3 WHERE id = $4', [req.body.nome, req.body.descrizione||"", req.body.is_bar, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.delete('/api/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.post('/api/prodotti', async (req, res) => { try { await pool.query('INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, 999)', [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.ristorante_id, req.body.immagine_url||""]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
app.put('/api/prodotti/:id', async (req, res) => { try { await pool.query(`UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6 WHERE id=$7`, [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.immagine_url||"", req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/prodotti/riordina', async (req, res) => { const { prodotti } = req.body; try { for (const prod of prodotti) { if(prod.categoria) await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]); else await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/ristorante/servizio/:id', async (req, res) => { try { await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/upload', upload.single('photo'), async (req, res) => { try { res.json({ url: req.file.path }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => { const { ristorante_id } = req.body; if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." }); try { const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const sheetName = workbook.SheetNames[0]; const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); for (const row of data) { const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome"; const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0; const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale"; const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : ""; const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : ""; let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]); if (catCheck.rows.length === 0) { const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', [categoria, (maxPos.rows[0].max||0)+1, ristorante_id, ""]); } await pool.query(`INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) VALUES ($1, $2, $3, $4, $5, $6, 999)`, [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id]); } res.json({ success: true, message: `Importati ${data.length} piatti!` }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/export-excel/:ristorante_id', async (req, res) => { try { const result = await pool.query(`SELECT nome as "Nome", prezzo as "Prezzo", categoria as "Categoria", sottocategoria as "Sottocategoria", descrizione as "Descrizione" FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome`, [req.params.ristorante_id]); const workbook = xlsx.utils.book_new(); const worksheet = xlsx.utils.json_to_sheet(result.rows); xlsx.utils.book_append_sheet(workbook, worksheet, "Menu"); const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Disposition', 'attachment; filename="menu_export.xlsx"'); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buffer); } catch (err) { res.status(500).json({ error: "Errore Export" }); } });
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT id, nome, slug, ordini_abilitati, email, telefono FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, ordini_abilitati) VALUES ($1, $2, $3, $4, $5, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { if (req.body.ordini_abilitati !== undefined && Object.keys(req.body).length === 1) { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, req.params.id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, req.params.id); } else { sql += " WHERE id=$5"; params.push(req.params.id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.post('/api/ordine/completato', async (req, res) => { try { await pool.query("UPDATE ordini SET stato = 'servito' WHERE id = $1", [req.body.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.get('/api/reset-ordini', async (req, res) => { try { await pool.query('DELETE FROM ordini'); await pool.query('ALTER SEQUENCE ordini_id_seq RESTART WITH 1'); res.send("<h1>✅ TABULA RASA</h1>"); } catch (e) { res.status(500).send("Errore: " + e.message); } });

initDb().then((ready) => { if (ready) app.listen(port, () => console.log(`🚀 SERVER V31 (LOG & TOTALE) - Porta ${port}`)); });