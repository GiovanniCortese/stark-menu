// server/server.js - VERSIONE V_ROLES & STATS
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

// --- DATABASE AUTO-FIX (Aggiornato per Ruoli e Stats) ---
const fixDatabase = async () => {
    try {
        // Collega lo staff al ristorante
        await pool.query("ALTER TABLE utenti ADD COLUMN IF NOT EXISTS ristorante_id INTEGER");
        
        // Collega gli ordini all'utente registrato (per lo storico clienti)
        await pool.query("ALTER TABLE ordini ADD COLUMN IF NOT EXISTS utente_id INTEGER");

        // Altri fix esistenti
        await pool.query("ALTER TABLE categorie ADD COLUMN IF NOT EXISTS varianti_default JSONB DEFAULT '[]'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_cassa TEXT DEFAULT '1234'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_cucina TEXT DEFAULT '1234'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_bar TEXT DEFAULT '1234'");
        await pool.query("ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS pw_pizzeria TEXT DEFAULT '1234'");
        await pool.query("ALTER TABLE ordini ADD COLUMN IF NOT EXISTS cameriere TEXT");
        await pool.query("ALTER TABLE utenti ADD COLUMN IF NOT EXISTS telefono_verificato BOOLEAN DEFAULT FALSE");
        await pool.query("ALTER TABLE utenti ADD COLUMN IF NOT EXISTS codice_otp TEXT");

        console.log("✅ DB Check: Colonne Ruoli e Stats presenti.");
    } catch (e) { console.log("DB Check OK"); }
};
fixDatabase();

// CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-app' } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() });

const getNowItaly = () => {
    return new Date().toLocaleString('it-IT', { 
        timeZone: 'Europe/Rome',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};


// ==========================================
//          API GESTIONE UTENTI & STAFF
// ==========================================

// 1. Registrazione (Aggiornata per Admin che crea Staff)
app.post('/api/register', async (req, res) => {
    try {
        const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body;
        
        const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" });

        // Se è un admin che crea staff, usiamo il suo ristorante_id. Se è un cliente, è null.
        const r_id = (ruolo === 'cameriere' || ruolo === 'editor') ? ristorante_id : null;

        const r = await pool.query(
            'INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo, ristorante_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [nome, email, password, telefono, indirizzo, ruolo || 'cliente', r_id]
        );
        res.json({ success: true, user: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// 2. Login (Uguale a prima)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]);
        if (r.rows.length > 0) {
            res.json({ success: true, user: r.rows[0] });
        } else {
            res.json({ success: false, error: "Credenziali errate" });
        }
    } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

// 3. GET Utenti (LOGICA DI VISIBILITÀ)
app.get('/api/utenti', async (req, res) => {
    try {
        const { mode, ristorante_id } = req.query; // mode: 'super', 'staff', 'clienti'

        if (mode === 'super') {
            // SUPER ADMIN: Vede TUTTI
            const r = await pool.query('SELECT * FROM utenti ORDER BY id DESC');
            return res.json(r.rows);
        } 
        
        if (mode === 'staff' && ristorante_id) {
            // ADMIN LOCALE: Vede solo il suo Staff (Editor e Camerieri legati al suo ID)
            const r = await pool.query(
                "SELECT * FROM utenti WHERE ristorante_id = $1 AND ruolo IN ('cameriere', 'editor') ORDER BY nome", 
                [ristorante_id]
            );
            return res.json(r.rows);
        }

        if (mode === 'clienti' && ristorante_id) {
            // ADMIN LOCALE: Vede i Clienti che hanno fatto ordini nel suo locale
            // Usiamo DISTINCT per non duplicarli se hanno fatto 100 ordini
            const r = await pool.query(`
                SELECT DISTINCT u.id, u.nome, u.email, u.telefono, u.indirizzo, MAX(o.data_ora) as ultimo_ordine
                FROM utenti u
                JOIN ordini o ON u.id = o.utente_id
                WHERE o.ristorante_id = $1
                GROUP BY u.id, u.nome, u.email, u.telefono, u.indirizzo
                ORDER BY ultimo_ordine DESC
            `, [ristorante_id]);
            return res.json(r.rows);
        }

        res.json([]);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// 4. Modifica Utente
app.put('/api/utenti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, password, telefono, indirizzo, ruolo } = req.body;
        await pool.query(
            `UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`,
            [nome, email, password, telefono, indirizzo, ruolo, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore modifica utente" }); }
});

// 5. Elimina Utente
app.delete('/api/utenti/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore eliminazione utente" }); }
});

// ==========================================
//          API DASHBOARD STATISTICHE
// ==========================================

app.get('/api/stats/dashboard/:ristorante_id', async (req, res) => {
    const { ristorante_id } = req.params;
    try {
        // 1. Incasso Oggi vs Ieri
        const incassi = await pool.query(`
            SELECT 
                SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi,
                SUM(CASE WHEN data_ora::date = CURRENT_DATE - 1 THEN totale ELSE 0 END) as ieri
            FROM ordini 
            WHERE ristorante_id = $1 AND stato = 'pagato'
        `, [ristorante_id]);

        // 2. Piatti più venduti (Top 5)
        // Nota: i prodotti sono in JSON, quindi è complesso fare query SQL pure. 
        // Per semplicità ed efficienza, prendiamo gli ultimi 1000 ordini ed elaboriamo in JS.
        // Se hai migliaia di ordini al giorno, servirebbe una tabella di dettaglio 'ordini_items'.
        const ordiniRecenti = await pool.query(`
            SELECT prodotti FROM ordini 
            WHERE ristorante_id = $1 AND stato = 'pagato' 
            ORDER BY data_ora DESC LIMIT 500
        `, [ristorante_id]);

        const piattoCount = {};
        ordiniRecenti.rows.forEach(row => {
            const prodotti = typeof row.prodotti === 'string' ? JSON.parse(row.prodotti) : row.prodotti;
            if(Array.isArray(prodotti)) {
                prodotti.forEach(p => {
                    if(piattoCount[p.nome]) piattoCount[p.nome]++;
                    else piattoCount[p.nome] = 1;
                });
            }
        });
        const topDishes = Object.entries(piattoCount)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, value: count }));

        // 3. Orari di Punta (Basato sugli ordini di oggi)
        const orari = await pool.query(`
            SELECT EXTRACT(HOUR FROM data_ora) as ora, COUNT(*) as count
            FROM ordini 
            WHERE ristorante_id = $1 AND data_ora::date = CURRENT_DATE
            GROUP BY ora 
            ORDER BY ora
        `, [ristorante_id]);

        const chartData = orari.rows.map(r => ({ name: `${r.ora}:00`, ordini: parseInt(r.count) }));

        res.json({
            incassi: incassi.rows[0],
            topDishes,
            chartData
        });

    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: "Errore statistiche" }); 
    }
});

// ==========================================
//    MODIFICA ORDINE PER SALVARE USER ID
// ==========================================
// Quando crei l'ordine, salva anche utente_id se presente
app.post('/api/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id } = req.body; // <--- utente_id NUOVO
        
        const dataOra = getNowItaly();
        let logIniziale = `[${dataOra}] 🆕 ORDINE DA: ${cameriere ? cameriere : 'Cliente ('+cliente+')'}\n`;
        
        if (Array.isArray(prodotti)) {
            prodotti.forEach(p => {
                let note = "";
                try {
                    if(p.varianti_scelte) { 
                         if(p.varianti_scelte.rimozioni && p.varianti_scelte.rimozioni.length > 0) note += ` (No: ${p.varianti_scelte.rimozioni.join(', ')})`;
                         if(p.varianti_scelte.aggiunte && p.varianti_scelte.aggiunte.length > 0) note += ` (+: ${p.varianti_scelte.aggiunte.map(a=>a.nome).join(', ')})`;
                    }
                } catch(e) {}
                logIniziale += ` • ${p.nome}${note} - ${Number(p.prezzo).toFixed(2)}€\n`;
            });
        }
        logIniziale += `TOTALE PARZIALE: ${Number(totale).toFixed(2)}€\n----------------------------------\n`;

        // AGGIUNTO utente_id ALLA QUERY
        await pool.query(
            "INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id) VALUES ($1, $2, $3, $4, 'in_attesa', $5, $6, $7)", 
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, logIniziale, cameriere || null, utente_id || null]
        );
        
        res.json({ success: true });
    } catch (e) { 
        console.error("Errore ordine:", e);
        res.status(500).json({ error: "Err" }); 
    }
});

// ==========================================
//              API CATEGORIE
// ==========================================

app.post('/api/categorie', async (req, res) => {
    try {
        const { nome, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default } = req.body;
        const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;
        
        // Trasforma il testo "Bufala:2, Crudo:3" in JSON per il database
        let variantiJson = [];
        if (typeof varianti_default === 'string' && varianti_default.includes(':')) {
             variantiJson = varianti_default.split(',').map(v => {
                const [n, p] = v.split(':');
                if(n && p) return { nome: n.trim(), prezzo: parseFloat(p) };
                return null;
            }).filter(Boolean);
        }

        const r = await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [nome, nextPos, ristorante_id, is_bar || false, is_pizzeria || false, descrizione || "", JSON.stringify(variantiJson)]
        );
        res.json(r.rows[0]);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/categorie/riordina', async (req, res) => {
    const { categorie } = req.body;
    try {
        for (const cat of categorie) {
            await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/categorie/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
app.put('/api/categorie/:id', async (req, res) => {
    try {
        const { nome, is_bar, is_pizzeria, descrizione, varianti_default } = req.body;
        
        // Logica Parsing (identica alla POST)
        let variantiJson = [];
        if (typeof varianti_default === 'string' && varianti_default.includes(':')) {
             variantiJson = varianti_default.split(',').map(v => {
                const [n, p] = v.split(':');
                if(n && p) return { nome: n.trim(), prezzo: parseFloat(p) };
                return null;
            }).filter(Boolean);
        } else if (Array.isArray(varianti_default)) {
            // Se arriva già come array (raro ma possibile)
            variantiJson = varianti_default;
        }

        await pool.query('UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3, descrizione=$4, varianti_default=$5 WHERE id=$6', 
            [nome, is_bar, is_pizzeria, descrizione, JSON.stringify(variantiJson), req.params.id]);
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
//              API PRODOTTI
// ==========================================

app.post('/api/prodotti', async (req, res) => {
    try {
        const { nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, varianti } = req.body;
        const max = await pool.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        const nextPos = (max.rows[0].max || 0) + 1;
        
        await pool.query(
            'INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, immagine_url, posizione, varianti) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
            [nome, prezzo, categoria, sottocategoria || "", descrizione || "", ristorante_id, immagine_url || "", nextPos, varianti || '{}']
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.put('/api/prodotti/:id', async (req, res) => {
    try {
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
//        API EXCEL & GRAFICA (AGGIORNATE V8)
// ==========================================

app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." });
    
    const client = await pool.connect(); // Usiamo una transazione per sicurezza
    try {
        await client.query('BEGIN');

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        
        let maxCat = await client.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]);
        let nextCatPos = (maxCat.rows[0].max || 0) + 1;

        let maxProd = await client.query('SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', [ristorante_id]);
        let nextProdPos = (maxProd.rows[0].max || 0) + 1;

        for (const row of data) {
            const nome = row['Nome'] ? String(row['Nome']).trim() : "Senza Nome";
            const prezzo = row['Prezzo'] ? parseFloat(String(row['Prezzo']).replace(',', '.')) : 0;
            const categoria = row['Categoria'] ? String(row['Categoria']).trim() : "Generale";
            const sottocategoria = row['Sottocategoria'] ? String(row['Sottocategoria']).trim() : "";
            const descrizione = row['Descrizione'] ? String(row['Descrizione']).trim() : "";
            
            // --- NUOVO: Parsing Varianti Categoria dall'Excel ---
            const variantiCatStr = row['Varianti Categoria (Default)'] || ""; // Es: "Bufala:2, Crudo:3"
            let variantiCatJson = [];
            if (variantiCatStr && variantiCatStr.includes(':')) {
                variantiCatJson = variantiCatStr.split(',').map(v => {
                    const parts = v.split(':');
                    if(parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) };
                    return null;
                }).filter(Boolean);
            }

            // GESTIONE CATEGORIA (Crea o Aggiorna)
            let catCheck = await client.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            
            if (catCheck.rows.length === 0) {
                // CREA NUOVA con varianti
                await client.query(
                    'INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5)', 
                    [categoria, nextCatPos++, ristorante_id, "", JSON.stringify(variantiCatJson)]
                );
            } else {
                // AGGIORNA ESISTENTE (Se nell'excel c'è scritto qualcosa, aggiorniamo le varianti della categoria)
                if (variantiCatStr.length > 0) {
                    await client.query(
                        'UPDATE categorie SET varianti_default = $1 WHERE id = $2',
                        [JSON.stringify(variantiCatJson), catCheck.rows[0].id]
                    );
                }
            }

            // --- Parsing Varianti Prodotto (Base + Aggiunte) ---
            const baseStr = row['Ingredienti Base (Rimovibili)'] || "";
            const aggiunteStr = row['Aggiunte Prodotto (Formato Nome:Prezzo)'] || ""; // Rinominata per chiarezza
            
            const baseArr = baseStr.split(',').map(s=>s.trim()).filter(Boolean);
            let aggiunteArr = [];
            if(aggiunteStr) {
                aggiunteArr = aggiunteStr.split(',').map(v => {
                    const parts = v.split(':');
                    if(parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) };
                    return null;
                }).filter(Boolean);
            }

            const variantiProdotto = { base: baseArr, aggiunte: aggiunteArr };

            await client.query(
                `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione, varianti) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, nextProdPos++, JSON.stringify(variantiProdotto)]
            );
        }
        
        await client.query('COMMIT');
        res.json({ success: true, message: `Importati ${data.length} piatti e aggiornate categorie!` });
    } catch (err) { 
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: err.message }); 
    } finally {
        client.release();
    }
});

app.get('/api/export-excel/:ristorante_id', async (req, res) => {
    try {
        // JOIN con categorie per prendere anche le varianti default
        const result = await pool.query(`
            SELECT p.*, c.varianti_default as cat_varianti
            FROM prodotti p 
            LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id
            WHERE p.ristorante_id = $1 
            ORDER BY c.posizione, p.posizione
        `, [req.params.ristorante_id]);
        
        const dataForExcel = result.rows.map(row => {
            let baseStr = "";
            let aggiunteStr = "";
            let catVarStr = "";

            // Parsing Varianti Prodotto
            try {
                const v = typeof row.varianti === 'string' ? JSON.parse(row.varianti) : (row.varianti || {});
                if(v.base && Array.isArray(v.base)) baseStr = v.base.join(', ');
                if(v.aggiunte && Array.isArray(v.aggiunte)) aggiunteStr = v.aggiunte.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', ');
            } catch(e) {}

            // Parsing Varianti Categoria (per Export)
            try {
                const cv = typeof row.cat_varianti === 'string' ? JSON.parse(row.cat_varianti) : (row.cat_varianti || []);
                if(Array.isArray(cv)) catVarStr = cv.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', ');
            } catch(e) {}

            return {
                "Categoria": row.categoria,
                "Varianti Categoria (Default)": catVarStr, // NUOVA COLONNA
                "Sottocategoria": row.sottocategoria,
                "Nome": row.nome,
                "Prezzo": row.prezzo,
                "Descrizione": row.descrizione,
                "Ingredienti Base (Rimovibili)": baseStr,
                "Aggiunte Prodotto (Formato Nome:Prezzo)": aggiunteStr
            };
        });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
        
        // Auto-width colonne per bellezza
        const wscols = [
            {wch:20}, {wch:30}, {wch:15}, {wch:25}, {wch:10}, {wch:30}, {wch:30}, {wch:30}
        ];
        worksheet['!cols'] = wscols;

        xlsx.utils.book_append_sheet(workbook, worksheet, "Menu Completo");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="menu_export_full.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (err) { console.error(err); res.status(500).json({ error: "Errore Export" }); }
});

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

app.get('/api/cassa/storico/:ristorante_id', async (req, res) => {
    try {
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
        if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]);
        if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({error:"Err"}); }
});

app.get('/api/menu/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Non trovato" });
        
        const data = rist.rows[0];
        
       const menu = await pool.query(`
    SELECT p.*, 
           c.is_bar as categoria_is_bar, 
           c.is_pizzeria as categoria_is_pizzeria,
           c.posizione as categoria_posizione,
           c.nome as categoria_nome,
           c.varianti_default as categoria_varianti  -- <--- QUESTA È LA RIGA NUOVA DA AGGIUNGERE
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
    const { email, password } = req.body; // Riceviamo solo email e password
    
    try {
        // Cerchiamo il ristorante SOLO tramite email
        const result = await pool.query(
            "SELECT * FROM ristoranti WHERE email = $1", 
            [email]
        );
        
        if (result.rows.length > 0) {
            const ristorante = result.rows[0];
            
            // Verifica la password
            if (ristorante.password === password) {
                return res.json({ 
                    success: true, 
                    user: { 
                        id: ristorante.id, 
                        nome: ristorante.nome, 
                        slug: ristorante.slug // Lo slug serve al frontend per la sessione
                    } 
                });
            }
        }
        
        // Se non trova corrispondenza o password errata
        res.status(401).json({ success: false, error: "Email o password errati" });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Errore interno del server" });
    }
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

// ==========================================
//          API ORDINI (VERSIONE STAFF)
// ==========================================

app.post('/api/ordine', async (req, res) => {
    try {
        // 1. Aggiungiamo 'cameriere' ai dati ricevuti dal frontend
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere } = req.body;
        
        const dataOra = getNowItaly();
        
        // 2. Aggiorniamo il log iniziale per includere chi ha preso l'ordine
        let logIniziale = `[${dataOra}] 🆕 ORDINE DA: ${cameriere ? cameriere : 'Cliente ('+cliente+')'}\n`;
        
        if (Array.isArray(prodotti)) {
            prodotti.forEach(p => {
                let note = "";
                try {
                    if(p.varianti_scelte) { 
                         if(p.varianti_scelte.rimozioni && p.varianti_scelte.rimozioni.length > 0) note += ` (No: ${p.varianti_scelte.rimozioni.join(', ')})`;
                         if(p.varianti_scelte.aggiunte && p.varianti_scelte.aggiunte.length > 0) note += ` (+: ${p.varianti_scelte.aggiunte.map(a=>a.nome).join(', ')})`;
                    }
                } catch(e) {}
                logIniziale += ` • ${p.nome}${note} - ${Number(p.prezzo).toFixed(2)}€\n`;
            });
        }
        logIniziale += `TOTALE PARZIALE: ${Number(totale).toFixed(2)}€\n----------------------------------\n`;

        // 3. Eseguiamo la query aggiungendo la colonna cameriere alla fine
        await pool.query(
            "INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere) VALUES ($1, $2, $3, $4, 'in_attesa', $5, $6)", 
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, logIniziale, cameriere || null]
        );
        
        res.json({ success: true });
    } catch (e) { 
        console.error("Errore ordine:", e);
        res.status(500).json({ error: "Err" }); 
    }
});

// --- FIX ORARIO NELL'AGGIORNAMENTO ---
app.put('/api/ordine/:id/update-items', async (req, res) => { 
    try { 
        const { id } = req.params; 
        const { prodotti, totale, logMsg } = req.body; 
        let q = "UPDATE ordini SET prodotti = $1"; 
        const p = [JSON.stringify(prodotti)]; 
        let i = 2; 
        
        if(totale!==undefined){ q+=`, totale=$${i}`; p.push(totale); i++ } 
        
        if(logMsg){ 
            q+=`, dettagli=COALESCE(dettagli,'')||$${i}`; 
            // USA getNowItaly()
            p.push(`\n[${getNowItaly()}] ${logMsg}`); 
            i++ 
        } 
        
        q+=` WHERE id=$${i}`; p.push(id); 
        await pool.query(q, p); 
        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
});

// --- FIX ORARIO NEL PAGAMENTO ---
app.post('/api/cassa/paga-tavolo', async (req, res) => { 
    const c = await pool.connect(); 
    try { 
        await c.query('BEGIN'); 
        const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [req.body.ristorante_id, String(req.body.tavolo)]); 
        if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});} 
        
        let tot=0, prod=[], log=""; 
        r.rows.forEach(o=>{ 
            tot+=Number(o.totale||0); 
            let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} 
            prod=[...prod, ...p]; 
            if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; 
        }); 
        
        // USA getNowItaly()
        log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`; 
        
        await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); 
        if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); 
        await c.query('COMMIT'); 
        res.json({success:true}); 
    } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} 
});

app.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));

// API SUPER ADMIN
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { const { id } = req.params; if (req.body.account_attivo !== undefined) { await pool.query('UPDATE ristoranti SET account_attivo = $1 WHERE id = $2', [req.body.account_attivo, id]); return res.json({ success: true }); } if (req.body.cucina_super_active !== undefined) { await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

// Rotta Login Super Admin
const { authenticator } = require('otplib');

app.post('/api/super/login', (req, res) => {
    const { email, password, code2fa } = req.body;
    
    // 1. Verifica Email e Password (come prima)
    if (email === process.env.SUPER_ADMIN_EMAIL && password === process.env.SUPER_ADMIN_PASSWORD) {
        
        // 2. Verifica il codice dinamico con Google Authenticator
        // 'SUPER_ADMIN_SECRET' è una stringa segreta che conosci solo tu nel .env
        const isValid = authenticator.check(code2fa, process.env.SUPER_ADMIN_SECRET);

        if (isValid) {
            return res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" });
        } else {
            return res.json({ success: false, error: "Codice 2FA non valido o scaduto" });
        }
    }
    res.status(401).json({ success: false, error: "Credenziali non valide" });
});

// ==========================================
//          API SICUREZZA REPARTI
// ==========================================

// Login per lo Staff (Cucina, Bar, Pizzeria, Cassa)
app.post('/api/auth/station', async (req, res) => {
    try {
        const { ristorante_id, role, password } = req.body;
        
        // Mappa il ruolo alla colonna del DB
        const roleMap = {
            'cassa': 'pw_cassa',
            'cucina': 'pw_cucina',
            'pizzeria': 'pw_pizzeria',
            'bar': 'pw_bar'
        };

        const colonnaPwd = roleMap[role];
        if (!colonnaPwd) return res.json({ success: false, error: "Ruolo non valido" });

        const r = await pool.query(`SELECT id, nome, ${colonnaPwd} as password_reparto FROM ristoranti WHERE id = $1`, [ristorante_id]);
        
        if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" });
        
        // Verifica Password
        if (String(r.rows[0].password_reparto) === String(password)) {
            res.json({ success: true, nome_ristorante: r.rows[0].nome });
        } else {
            res.json({ success: false, error: "Password Errata" });
        }
    } catch (e) { res.status(500).json({ error: "Errore server" }); }
});

// Aggiorna password reparti (Solo Admin)
app.put('/api/ristorante/security/:id', async (req, res) => {
    try {
        const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar } = req.body;
        await pool.query(
            `UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4 WHERE id=$5`,
            [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, req.params.id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore salvataggio" }); }
});

// ==========================================
//              API UTENTI (CRM)
// ==========================================

app.post('/api/register', async (req, res) => {
    try {
        const { nome, email, password, telefono, indirizzo } = req.body;
        const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" });

        const r = await pool.query(
            'INSERT INTO utenti (nome, email, password, telefono, indirizzo) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [nome, email, password, telefono, indirizzo]
        );
        res.json({ success: true, user: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]);
        if (r.rows.length > 0) {
            res.json({ success: true, user: r.rows[0] });
        } else {
            res.json({ success: false, error: "Credenziali errate" });
        }
    } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

app.get('/api/utenti', async (req, res) => {
    try {
        const r = await pool.query('SELECT * FROM utenti ORDER BY data_registrazione DESC');
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

app.put('/api/utenti/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, password, telefono, indirizzo, ruolo } = req.body;
        await pool.query(
            `UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`,
            [nome, email, password, telefono, indirizzo, ruolo, id]
        );
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore modifica utente" }); }
});

app.get('/api/utenti/export/excel', async (req, res) => {
    try {
        const r = await pool.query("SELECT nome, email, password, telefono, indirizzo, ruolo, data_registrazione FROM utenti ORDER BY id");
        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(r.rows);
        xlsx.utils.book_append_sheet(workbook, worksheet, "Utenti");
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="lista_utenti.xlsx"');
        res.send(buffer);
    } catch (e) { res.status(500).json({ error: "Errore Export" }); }
});

app.post('/api/utenti/import/excel', upload.single('file'), async (req, res) => {
    try {
        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        for (const row of data) {
            const ruolo = row.ruolo || 'cliente'; 
            const check = await pool.query("SELECT id FROM utenti WHERE email = $1", [row.email]);
            if (check.rows.length > 0) {
                await pool.query(
                    "UPDATE utenti SET nome=$1, password=$2, telefono=$3, indirizzo=$4, ruolo=$5 WHERE email=$6",
                    [row.nome, row.password, row.telefono, row.indirizzo, ruolo, row.email]
                );
            } else {
                await pool.query(
                    "INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo) VALUES ($1, $2, $3, $4, $5, $6)",
                    [row.nome, row.email, row.password, row.telefono, row.indirizzo, ruolo]
                );
            }
        }
        res.json({ success: true, message: "Importazione completata" });
    } catch (e) { console.error(e); res.status(500).json({ error: "Errore Import" }); }
});

app.listen(port, () => console.log(`🚀 SERVER V9 COMPLETE (Porta ${port})`));