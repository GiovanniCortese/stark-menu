// server/server.js - VERSIONE ALL-IN-ONE (FIX DEFINITIVO + EXCEL + GRAFICA + VARIANTI)
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
const uploadFile = multer({ storage: multer.memoryStorage() }); // Per Excel

// ==========================================
//              API CATEGORIE (FIXATE)
// ==========================================

// 1. CREA CATEGORIA (Calcola posizione corretta invece di 999)
app.post('/api/categorie', async (req, res) => {
    try {
        const { nome, ristorante_id, is_bar, is_pizzeria, descrizione } = req.body;
        const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;
        const r = await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria, descrizione) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [nome, nextPos, ristorante_id, is_bar || false, is_pizzeria || false, descrizione || ""]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. RIORDINA CATEGORIE
app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body;
    try {
        for (const cat of categorie) {
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. LEGGI/MODIFICA/ELIMINA
app.get('/api/categorie/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
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

// ==========================================
//              API PRODOTTI (FIXATE)
// ==========================================

// 1. CREA PRODOTTO (Calcola posizione corretta invece di 999 + VARIANTI)
app.post('/api/prodotti', async (req, res) => {
    try {
        const { nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, varianti } = req.body;
        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;
        
        // MODIFICATO QUI: AGGIUNTO IL CAMPO varianti ($9)
        await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione, varianti) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [nome, prezzo, categoria, sottocategoria || "", descrizione || "", ristorante_id, immagine_url || "", nextPos, varianti || '{}']
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. RIORDINA PRODOTTI
app.put('/api/prodotti/riordina', async (req, res) => {
    const { prodotti } = req.body;
    try {
        for (const prod of prodotti) {
            if (prod.categoria) {
                await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]);
            } else {
                await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]);
            }
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. CRUD PRODOTTI (MODIFICATO PER AGGIORNARE VARIANTI)
app.put('/api/prodotti/:id', async (req, res) => {
    try {
        // MODIFICATO QUI: AGGIUNTO IL CAMPO varianti ($8)
        await pool.query('UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6, varianti=$8 WHERE id=$7', 
            [req.body.nome, req.body.prezzo, req.body.categoria, req.body.sottocategoria, req.body.descrizione, req.body.immagine_url, req.params.id, req.body.varianti]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
app.delete('/api/prodotti/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// ==========================================
//        API EXCEL & GRAFICA (REINSERITE!)
// ==========================================

// 1. IMPORT EXCEL
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." });
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        // Per evitare conflitti, cerchiamo il MAX attuale
        let maxCat = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        let nextCatPos = (maxCat.rows[0].max || 0) + 1;

        let maxProd = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        let nextProdPos = (maxProd.rows[0].max || 0) + 1;

        for (const row of data) {
            const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome";
            const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0;
            const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale";
            const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : "";
            const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : "";

            // Controlla e crea Categoria
            let catCheck = await pool.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                await pool.query('INSERT INTO categorie (nome, posizione, ristorante_id, descrizione) VALUES ($1, $2, $3, $4)', 
                    [categoria, nextCatPos++, ristorante_id, ""]);
            }

            // Crea Prodotto
            await pool.query(
                `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, nextProdPos++]
            );
        }
        res.json({ success: true, message: `Importati ${data.length} piatti!` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. EXPORT EXCEL (VERSIONE POTENZIATA CON VARIANTI)
app.get('/api/export-excel/:ristorante_id', async (req, res) => {
    try {
        // 1. Prendiamo tutto (*) per poter processare le varianti
        const result = await pool.query(`SELECT * FROM prodotti WHERE ristorante_id = $1 ORDER BY categoria, nome`, [req.params.ristorante_id]);
        
        // 2. Processiamo i dati per renderli leggibili in Excel
        const dataForExcel = result.rows.map(row => {
            let baseStr = "";
            let aggiunteStr = "";
            
            try {
                // Parsing sicuro del JSONB
                const variantiObj = typeof row.varianti === 'string' ? JSON.parse(row.varianti) : (row.varianti || {});
                
                // Formattiamo Ingredienti Base (es: "Pomodoro, Mozzarella")
                if(variantiObj.base && Array.isArray(variantiObj.base)) {
                    baseStr = variantiObj.base.join(', ');
                }

                // Formattiamo Aggiunte (es: "Bufala:2.00, Cotto:1.50")
                if(variantiObj.aggiunte && Array.isArray(variantiObj.aggiunte)) {
                    aggiunteStr = variantiObj.aggiunte.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', ');
                }

            } catch(e) { console.error("Errore parsing varianti per excel", row.id); }

            // Ritorniamo l'oggetto con le colonne nell'ordine desiderato
            return {
                "Categoria": row.categoria,
                "Sottocategoria": row.sottocategoria,
                "Nome": row.nome,
                "Prezzo": row.prezzo,
                "Descrizione": row.descrizione,
                "Ingredienti Base (Rimovibili)": baseStr,   // NUOVA COLONNA
                "Aggiunte (Formato Nome:Prezzo)": aggiunteStr // NUOVA COLONNA
            };
        });

        // 3. Creazione file Excel
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Menu Completo");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="menu_export_full.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { console.error(err); res.status(500).json({ error: "Errore Export" }); }
});

// 3. SALVA STILE GRAFICO
app.put('/api/ristorante/style/:id', async (req, res) => {
    try {
        const { logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style } = req.body;
        await pool.query(
            `UPDATE ristoranti SET logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, font_style=$7 WHERE id=$8`,
            [logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, font_style, req.params.id]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Errore salvataggio stile" }); }
});

// ==========================================
//           API GENERICHE E ADMIN
// ==========================================

// --- API STORICO CASSA (MANCAVA QUESTA!) ---
app.get('/api/cassa/storico/:ristorante_id', async (req, res) => {
    try {
        // Prende gli ultimi 50 ordini pagati
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]);
        
        const ordini = r.rows.map(o => {
            try { return { ...o, prodotti: JSON.parse(o.prodotti) }; } 
            catch { return { ...o, prodotti: [] }; }
        });
        
        res.json(ordini);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.get('/api/ristorante/config/:id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]);
        if (r.rows.length > 0) res.json(r.rows[0]);
        else res.status(404).json({ error: "Not Found" });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.put('/api/ristorante/servizio/:id', async (req, res) => {
    try {
        const { id } = req.params;
        // Gestione semplice toggle
        if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]);
        if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({error:"Err"}); }
});

// --- FIX PROPRIETÀ MENU (Ripristina is_bar/is_pizzeria per il frontend) ---
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Non trovato" });
        
        const data = rist.rows[0];
        
        // QUESTA QUERY ORA USA GLI ALIAS CORRETTI PER MENU.JSX (categoria_is_bar, ecc.)
        const menu = await pool.query(`
            SELECT p.*, 
                   c.is_bar as categoria_is_bar, 
                   c.is_pizzeria as categoria_is_pizzeria,
                   c.posizione as categoria_posizione
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

// Login
app.post('/api/login', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM ristoranti WHERE email=$1 AND password=$2', [req.body.email, req.body.password]);
        if (r.rows.length > 0) res.json({ success: true, user: r.rows[0] });
        else res.status(401).json({ success: false });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// Polling e Ordini
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

app.put('/api/ordine/:id/update-items', async (req, res) => { try { const { id } = req.params; const { prodotti, totale, logMsg } = req.body; let q = "UPDATE ordini SET prodotti = $1"; const p = [JSON.stringify(prodotti)]; let i = 2; if(totale!==undefined){q+=`, totale=$${i}`;p.push(totale);i++} if(logMsg){q+=`, dettagli=COALESCE(dettagli,'')||$${i}`;p.push(`\n[${new Date().toLocaleString()}] ${logMsg}`);i++} q+=` WHERE id=$${i}`; p.push(id); await pool.query(q, p); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

app.post('/api/cassa/paga-tavolo', async (req, res) => { const c = await pool.connect(); try { await c.query('BEGIN'); const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [req.body.ristorante_id, String(req.body.tavolo)]); if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});} let tot=0, prod=[], log=""; r.rows.forEach(o=>{ tot+=Number(o.totale||0); let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} prod=[...prod, ...p]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; }); log+=`\nCHIUSO: ${tot}€`; await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); await c.query('COMMIT'); res.json({success:true}); } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} });

app.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));

// API SUPER ADMIN (REINSERITE)
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { const { id } = req.params; if (req.body.account_attivo !== undefined) { await pool.query('UPDATE ristoranti SET account_attivo = $1 WHERE id = $2', [req.body.account_attivo, id]); return res.json({ success: true }); } if (req.body.cucina_super_active !== undefined) { await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

app.listen(port, () => console.log(`🚀 SERVER DEFINITIVO COMPLETE (Porta ${port})`));