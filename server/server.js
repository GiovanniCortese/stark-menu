// server/server.js - VERSIONE V21 (ANTI-CRASH & ROBUST JSON PARSING) 🛡️
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

if (!process.env.DATABASE_URL) {
    console.error("❌ ERRORE: Manca DATABASE_URL");
    process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// --- INIT DB ---
const initDb = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️ Verifica DB...");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS ristoranti (id SERIAL PRIMARY KEY, nome TEXT NOT NULL, slug TEXT UNIQUE NOT NULL, ordini_abilitati BOOLEAN DEFAULT FALSE, servizio_attivo BOOLEAN DEFAULT FALSE, logo_url TEXT, cover_url TEXT, colore_sfondo TEXT DEFAULT '#222', colore_titolo TEXT DEFAULT '#fff', colore_testo TEXT DEFAULT '#ccc', colore_prezzo TEXT DEFAULT '#27ae60', font_style TEXT DEFAULT 'sans-serif', email TEXT, telefono TEXT, password TEXT DEFAULT 'tonystark');
            CREATE TABLE IF NOT EXISTS categorie (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), nome TEXT NOT NULL, descrizione TEXT, posizione INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS prodotti (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), categoria TEXT, sottocategoria TEXT, nome TEXT NOT NULL, descrizione TEXT, prezzo REAL, immagine_url TEXT, posizione INTEGER DEFAULT 0);
            CREATE TABLE IF NOT EXISTS ordini (id SERIAL PRIMARY KEY, ristorante_id INTEGER REFERENCES ristoranti(id), tavolo TEXT, stato TEXT DEFAULT 'in_attesa', data_ora TIMESTAMP DEFAULT CURRENT_TIMESTAMP, prodotti TEXT, totale REAL, dettagli TEXT);
        `);

        // AUTO-REPAIR COLONNE
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='categorie' AND column_name='is_bar') THEN 
                    ALTER TABLE categorie ADD COLUMN is_bar BOOLEAN DEFAULT FALSE; 
                END IF;
                -- Fix per evitare crash se 'prodotti' è null
                ALTER TABLE ordini ALTER COLUMN prodotti SET DEFAULT '[]';
            END $$;
        `);
        
        console.log("✅ Database pronto V21.");
        return true;
    } catch (err) { console.error("❌ Errore InitDB:", err); return false; } 
    finally { client.release(); }
};

// --- CONFIG CLOUDINARY ---
cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-pizzeria', allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() });

// --- ROTTE API ---

// 1. MENU
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query(`SELECT * FROM ristoranti WHERE slug = $1`, [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Ristorante non trovato" });
        const data = rist.rows[0];
        
        const query = `
            SELECT p.*, 
                   c.descrizione as categoria_descrizione,
                   c.nome as categoria_nome, 
                   c.posizione as categoria_posizione,
                   c.is_bar as categoria_is_bar
            FROM prodotti p 
            LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id 
            WHERE p.ristorante_id = $1 
            ORDER BY COALESCE(c.posizione, 999) ASC, p.posizione ASC
        `;
        const menu = await pool.query(query, [data.id]);
        
        res.json({ 
            id: data.id, 
            ristorante: data.nome,
            style: { logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, title: data.colore_titolo, text: data.colore_testo, price: data.colore_prezzo, font: data.font_style },
            ordini_abilitati: data.ordini_abilitati, 
            servizio_attivo: data.servizio_attivo, 
            menu: menu.rows 
        });
    } catch (err) { console.error(err); res.status(500).json({ error: "Server error" }); }
});

// 2. POLLING ULTRA-ROBUSTO (Fix per il crash)
app.get('/api/polling/:ristorante_id', async (req, res) => { 
    try { 
        // Prendi tutto ciò che NON è pagato (così la cassa vede tutto)
        const r = await pool.query(
            "SELECT * FROM ordini WHERE ristorante_id = $1 AND stato != 'pagato' ORDER BY data_ora ASC", 
            [req.params.ristorante_id]
        ); 
        
        const ordini = r.rows.map(o => {
            let parsed = [];
            
            // LOGICA DI PARSING SICURA (Non crasha mai)
            if (o.prodotti) {
                try {
                    const temp = typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti;
                    parsed = Array.isArray(temp) ? temp : [temp];
                } catch (e) {
                    // Se il JSON è rotto, crea un oggetto errore leggibile invece di crashare
                    console.error(`Errore parsing ordine ID ${o.id}:`, e);
                    parsed = [{ nome: `⚠️ Errore dati: ${String(o.prodotti).substring(0, 20)}...` }];
                }
            } else if (o.dettagli) {
                parsed = [{ nome: o.dettagli }]; // Fallback vecchio
            } else {
                parsed = []; // Ordine vuoto
            }

            return { ...o, prodotti: parsed };
        });
        
        res.json({ nuovi_ordini: ordini }); 
    } catch (e) { 
        console.error("CRITICAL POLLING ERROR:", e);
        res.status(500).send("Err"); 
    } 
});

// 3. CHIUSURA CONTO TAVOLO (CASSA)
app.post('/api/cassa/paga-tavolo', async (req, res) => {
    try {
        const { ristorante_id, tavolo } = req.body;
        // Chiude TUTTI gli ordini di quel tavolo
        await pool.query(
            "UPDATE ordini SET stato = 'pagato' WHERE ristorante_id = $1 AND tavolo = $2 AND stato != 'pagato'", 
            [ristorante_id, String(tavolo)] // Convertiamo in stringa per sicurezza
        );
        res.json({ success: true });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore pagamento" }); 
    }
});

// 4. STORICO ORDINI
app.get('/api/cassa/storico/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query(
            "SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 100", 
            [req.params.ristorante_id]
        );
        const ordini = r.rows.map(o => {
            let parsed = [];
            try { parsed = JSON.parse(o.prodotti || "[]"); } catch (e) { parsed = [{nome: "Errore dati"}]; }
            return { ...o, prodotti: parsed };
        });
        res.json(ordini);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// ALTRE API
app.post('/api/ordine', async (req, res) => { 
    try { 
        console.log("➡️ Ordine:", req.body); 
        const { ristorante_id, tavolo, prodotti, totale } = req.body; 
        
        // Verifica dati
        if(!prodotti) return res.status(400).json({error: "No prodotti"});

        const prodottiStr = JSON.stringify(prodotti); 
        await pool.query("INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato) VALUES ($1, $2, $3, $4, 'in_attesa')", [ristorante_id, String(tavolo), prodottiStr, totale]); 
        res.json({ success: true }); 
    } catch (e) { 
        console.error("Errore salvataggio ordine:", e);
        res.status(500).json({error: "Err"}); 
    } 
});

app.post('/api/ordine/completato', async (req, res) => { try { await pool.query("UPDATE ordini SET stato = 'servito' WHERE id = $1", [req.body.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });

app.post('/api/categorie', async (req, res) => { try { const { nome, ristorante_id, descrizione, is_bar } = req.body; const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); const next = (max.rows[0].max || 0) + 1; const r = await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, is_bar) VALUES ($1, $2, $3, $4, $5) RETURNING *', [nome, next, ristorante_id, descrizione||"", is_bar || false]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/categorie/:id', async (req, res) => { try { await pool.query('UPDATE categorie SET nome = $1, descrizione = $2, is_bar = $3 WHERE id = $4', [req.body.nome, req.body.descrizione||"", req.body.is_bar, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.put('/api/ristorante/style/:id', async (req, res) => { try { await pool.query(`UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, font_style=$7 WHERE id=$8`, [req.body.logo_url, req.body.cover_url, req.body.colore_sfondo, req.body.colore_titolo, req.body.colore_testo, req.body.colore_prezzo, req.body.font_style, req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.get('/api/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); res.json(r.rows[0]); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/prodotti', async (req, res) => { try { await pool.query('INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione) VALUES ($1, $2, $3, $4, $5, $6, $7, 999)', [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.ristorante_id, req.body.immagine_url||""]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
app.put('/api/prodotti/:id', async (req, res) => { try { await pool.query(`UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6 WHERE id=$7`, [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria||"", req.body.descrizione||"", req.body.immagine_url||"", req.params.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/prodotti/riordina', async (req, res) => { const { prodotti } = req.body; try { for (const prod of prodotti) { if(prod.categoria) await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]); else await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.delete('/api/categorie/:id', async (req, res) => { try { await pool.query('DELETE FROM categorie WHERE id = $1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.put('/api/categorie/riordina', async (req, res) => { const { categorie } = req.body; try { for (const cat of categorie) await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: "Err" }); } });
app.put('/api/ristorante/servizio/:id', async (req, res) => { try { await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/login', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE email = $1 AND password = $2', [req.body.email, req.body.password]); if(r.rows.length>0) res.json({success:true, user:r.rows[0]}); else res.status(401).json({success:false}); } catch(e){res.status(500).json({error:"Err"});} });
app.post('/api/upload', upload.single('photo'), async (req, res) => { try { res.json({ url: req.file.path }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => { const { ristorante_id } = req.body; if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." }); try { const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const sheetName = workbook.SheetNames[0]; const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); for (const row of data) { const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome"; const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0; const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale"; const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : ""; const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : ""; let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]); if (catCheck.rows.length === 0) { const maxPos = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', [categoria, (maxPos.rows[0].max||0)+1, ristorante_id, ""]); } await pool.query(`INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) VALUES ($1, $2, $3, $4, $5, $6, 999)`, [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id]); } res.json({ success: true, message: `Importati ${data.length} piatti!` }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/export-excel/:ristorante_id', async (req, res) => { try { const result = await pool.query(`SELECT nome as "Nome", prezzo as "Prezzo", categoria as "Categoria", sottocategoria as "Sottocategoria", descrizione as "Descrizione" FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome`, [req.params.ristorante_id]); const workbook = xlsx.utils.book_new(); const worksheet = xlsx.utils.json_to_sheet(result.rows); xlsx.utils.book_append_sheet(workbook, worksheet, "Menu"); const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' }); res.setHeader('Content-Disposition', 'attachment; filename="menu_export.xlsx"'); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.send(buffer); } catch (err) { res.status(500).json({ error: "Errore Export" }); } });
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT id, nome, slug, ordini_abilitati, email, telefono FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, ordini_abilitati) VALUES ($1, $2, $3, $4, $5, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { if (req.body.ordini_abilitati !== undefined && Object.keys(req.body).length === 1) { await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, req.params.id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, req.params.id); } else { sql += " WHERE id=$5"; params.push(req.params.id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

initDb().then((ready) => { if (ready) app.listen(port, () => console.log(`🚀 SERVER V21 (ANTI-CRASH) - Porta ${port}`)); });