// server/server.js - VERSIONE V11 MULTILINGUA (Secure & Atomic Updates)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const xlsx = require('xlsx');
const { authenticator } = require('otplib');

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

// CLOUDINARY
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
const storage = new CloudinaryStorage({ cloudinary: cloudinary, params: { folder: 'menu-app' } });
const upload = multer({ storage: storage });
const uploadFile = multer({ storage: multer.memoryStorage() }); // FIX CRITICO EXCEL

const getNowItaly = () => {
    return new Date().toLocaleString('it-IT', { 
        timeZone: 'Europe/Rome',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
};

// ==========================================
//          API GESTIONE ORDINI (ATOMIC FIX)
// ==========================================

// 1. Crea Ordine
app.post('/api/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id } = req.body;
        
        const dataOrdineLeggibile = getNowItaly(); 

        // STATO: Se c'è cameriere va in 'in_attesa' (Verde), se è App va in 'in_arrivo' (Arancione)
        const statoIniziale = cameriere ? 'in_attesa' : 'in_arrivo';

        // LOGICA NOME
        const nomeClienteDisplay = cliente || "Ospite";
        let logIniziale = `[${dataOrdineLeggibile}] 🆕 ORDINE DA: ${cameriere ? cameriere : nomeClienteDisplay}\n`;
        
        if (Array.isArray(prodotti)) {
            prodotti.forEach(p => {
                let note = "";
                if(p.varianti_scelte) { 
                     if(p.varianti_scelte.rimozioni?.length > 0) note += ` (No: ${p.varianti_scelte.rimozioni.join(', ')})`;
                     if(p.varianti_scelte.aggiunte?.length > 0) note += ` (+: ${p.varianti_scelte.aggiunte.map(a=>a.nome).join(', ')})`;
                }
                logIniziale += ` • ${p.nome}${note} - ${Number(p.prezzo).toFixed(2)}€\n`;
            });
        }
        logIniziale += `TOTALE PARZIALE: ${Number(totale).toFixed(2)}€\n----------------------------------\n`;

        // INSERT: Corretto ordine parametri e rimosso hardcode 'in_attesa'
        await pool.query(
            `INSERT INTO ordini 
            (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id, cliente, data_ora) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
                ristorante_id,              // $1
                String(tavolo),             // $2
                JSON.stringify(prodotti),   // $3
                totale,                     // $4
                statoIniziale,              // $5 <--- QUI ORA PRENDE LA VARIABILE (in_arrivo/in_attesa)
                logIniziale,                // $6
                cameriere || null,          // $7
                utente_id || null,          // $8
                nomeClienteDisplay          // $9
            ]
        );
        res.json({ success: true });
    } catch (e) { 
        console.error("Errore inserimento ordine:", e); 
        res.status(500).json({ error: "Errore inserimento ordine: " + e.message }); 
    }
});

// 2. PATCH ITEM (FIX CONFLITTI BAR/CUCINA)
app.put('/api/ordine/:id/patch-item', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); // Inizio Transazione Sicura
        const { id } = req.params;
        const { index, stato, operatore } = req.body; 

        const current = await client.query("SELECT prodotti, dettagli FROM ordini WHERE id = $1 FOR UPDATE", [id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({error: "Ordine non trovato"}); }

        let prodotti = typeof current.rows[0].prodotti === 'string' ? JSON.parse(current.rows[0].prodotti) : current.rows[0].prodotti;
        let dettagli = current.rows[0].dettagli || "";

        if (prodotti[index]) {
            if (prodotti[index].stato === stato) {
                await client.query('ROLLBACK');
                return res.json({ success: true }); 
            }

            prodotti[index].stato = stato;
            
            if (stato === 'servito') {
                prodotti[index].ora_servizio = new Date().toLocaleTimeString('it-IT', {hour: '2-digit', minute:'2-digit'});
                dettagli += `\n[${getNowItaly()}] [${operatore}] HA SERVITO: ${prodotti[index].nome}`;
            } else if (stato === 'in_attesa') {
                prodotti[index].riaperto = true;
                delete prodotti[index].ora_servizio;
                dettagli += `\n[${getNowItaly()}] [${operatore}] ⚠️ RIAPERTO: ${prodotti[index].nome}`;
            }
        }

        await client.query("UPDATE ordini SET prodotti = $1, dettagli = $2 WHERE id = $3", [JSON.stringify(prodotti), dettagli, id]);
        await client.query('COMMIT');
        res.json({ success: true });

    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
        res.status(500).json({ error: "Errore aggiornamento atomico" });
    } finally {
        client.release();
    }
});

// 3. UPDATE GENERICO
app.put('/api/ordine/:id/update-items', async (req, res) => { 
    try { 
        const { prodotti, totale, logMsg } = req.body; 
        let q = "UPDATE ordini SET prodotti = $1"; 
        const p = [JSON.stringify(prodotti)]; 
        let i = 2; 
        if(totale!==undefined){ q+=`, totale=$${i}`; p.push(totale); i++ } 
        if(logMsg){ q+=`, dettagli=COALESCE(dettagli,'')||$${i}`; p.push(`\n[${getNowItaly()}] ${logMsg}`); i++ } 
        q+=` WHERE id=$${i}`; p.push(req.params.id); 
        await pool.query(q, p); 
        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
});

// ==========================================
//          ALTRE API (Standard)
// ==========================================

// Login Auth Utenti
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const r = await pool.query('SELECT * FROM utenti WHERE email = $1 AND password = $2', [email, password]);
        if (r.rows.length > 0) res.json({ success: true, user: r.rows[0] });
        else res.json({ success: false, error: "Credenziali errate" });
    } catch (e) { res.status(500).json({ error: "Errore login" }); }
});

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { nome, email, password, telefono, indirizzo, ruolo, ristorante_id } = req.body;
        const check = await pool.query('SELECT * FROM utenti WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.json({ success: false, error: "Email già registrata" });
        const r_id = (ruolo === 'cameriere' || ruolo === 'editor') ? ristorante_id : null;
        const r = await pool.query('INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo, ristorante_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [nome, email, password, telefono, indirizzo, ruolo || 'cliente', r_id]);
        res.json({ success: true, user: r.rows[0] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Get Utenti
app.get('/api/utenti', async (req, res) => {
    try {
        const { mode, ristorante_id } = req.query; 

        if (mode === 'super') {
            const r = await pool.query('SELECT * FROM utenti ORDER BY id DESC');
            return res.json(r.rows);
        } 
        
        if (mode === 'staff' && ristorante_id) {
            const r = await pool.query(
                "SELECT * FROM utenti WHERE ristorante_id = $1 AND ruolo IN ('cameriere', 'editor') ORDER BY nome", 
                [ristorante_id]
            );
            return res.json(r.rows);
        }

        if ((mode === 'clienti' || mode === 'clienti_ordini') && ristorante_id) {
            const r = await pool.query(`
                SELECT 
                    u.id, u.nome, u.email, u.telefono, 
                    COUNT(o.id) as totale_ordini, 
                    MAX(o.data_ora) as ultimo_ordine
                FROM utenti u
                INNER JOIN ordini o ON u.id = o.utente_id
                WHERE o.ristorante_id = $1
                GROUP BY u.id, u.nome, u.email, u.telefono
                ORDER BY ultimo_ordine DESC
            `, [ristorante_id]);
            return res.json(r.rows);
        }

        res.json([]);
    } catch (e) { 
        console.error("Errore API Utenti:", e); 
        res.status(500).json({ error: e.message }); 
    }
});
// --- NUOVO: API STORICO & LIVE TRACKER CLIENTE ---
app.get('/api/ordini/cliente/:utente_id', async (req, res) => {
    try {
        const { utente_id } = req.params;
        const { tavolo } = req.query;

        // --- MODIFICA QUI: Aggiunta JOIN per prendere il nome del ristorante ---
        const query = `
            SELECT o.*, r.nome as nome_ristorante 
            FROM ordini o 
            JOIN ristoranti r ON o.ristorante_id = r.id 
            WHERE o.utente_id = $1 
            ORDER BY o.data_ora DESC
        `;
        // ---------------------------------------------------------------------

        let ordiniTavolo = [];
        if (tavolo && tavolo !== 'undefined') {
            const rTavolo = await pool.query(
                "SELECT o.*, r.nome as nome_ristorante FROM ordini o JOIN ristoranti r ON o.ristorante_id = r.id WHERE o.tavolo = $1 AND o.utente_id != $2 AND o.stato != 'pagato'", 
                [tavolo, utente_id]
            );
            ordiniTavolo = rTavolo.rows;
        }

        const rUser = await pool.query(query, [utente_id]);
        
        const ordiniPersonali = rUser.rows.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti}));
        const ordiniCondivisi = ordiniTavolo.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti, is_condiviso: true}));

        res.json({ personali: ordiniPersonali, condivisi: ordiniCondivisi });
    } catch (e) { console.error(e); res.status(500).json({ error: "Errore storico" }); }
});

// --- NUOVO: CALCOLO LIVELLO CLIENTE (API UTENTE ARRICCHITA) ---
app.get('/api/cliente/stats/:id', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT u.*, COUNT(o.id) as num_ordini 
            FROM utenti u 
            LEFT JOIN ordini o ON u.id = o.utente_id 
            WHERE u.id = $1 
            GROUP BY u.id`, 
            [req.params.id]
        );
        
        if(r.rows.length === 0) return res.status(404).json({error: "Utente non trovato"});
        
        const user = r.rows[0];
        const n = parseInt(user.num_ordini);
        
        // LOGICA LIVELLI (GAMIFICATION) 🏆
        let livello = { nome: "Novizio 🌱", colore: "#95a5a6", affidabilita: "Nuovo" }; // Grigio
        if (n >= 5) livello = { nome: "Buongustaio 🥉", colore: "#cd7f32", affidabilita: "Ok" }; // Bronzo
        if (n >= 15) livello = { nome: "Cliente Top 🥈", colore: "#bdc3c7", affidabilita: "Affidabile" }; // Argento
        if (n >= 30) livello = { nome: "VIP 🥇", colore: "#f1c40f", affidabilita: "Super Affidabile" }; // Oro
        if (n >= 100) livello = { nome: "Legend 💎", colore: "#3498db", affidabilita: "Divinità" }; // Diamante

        res.json({ ...user, livello });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});
app.put('/api/utenti/:id', async (req, res) => { try { const { nome, email, password, telefono, indirizzo, ruolo } = req.body; await pool.query(`UPDATE utenti SET nome=$1, email=$2, password=$3, telefono=$4, indirizzo=$5, ruolo=$6 WHERE id=$7`, [nome, email, password, telefono, indirizzo, ruolo, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.delete('/api/utenti/:id', async (req, res) => { try { await pool.query('DELETE FROM utenti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// Dashboard Stats
app.get('/api/stats/dashboard/:ristorante_id', async (req, res) => {
    try {
        const { ristorante_id } = req.params;
        const incassi = await pool.query(`SELECT SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi, SUM(CASE WHEN data_ora::date = CURRENT_DATE - 1 THEN totale ELSE 0 END) as ieri FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'`, [ristorante_id]);
        const ordiniRecenti = await pool.query(`SELECT prodotti FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 500`, [ristorante_id]);
        const piattoCount = {};
        ordiniRecenti.rows.forEach(row => {
            const prodotti = typeof row.prodotti === 'string' ? JSON.parse(row.prodotti) : row.prodotti;
            if(Array.isArray(prodotti)) prodotti.forEach(p => piattoCount[p.nome] = (piattoCount[p.nome] || 0) + 1);
        });
        const topDishes = Object.entries(piattoCount).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, value: count }));
        const orari = await pool.query(`SELECT EXTRACT(HOUR FROM data_ora) as ora, COUNT(*) as count FROM ordini WHERE ristorante_id = $1 AND data_ora::date = CURRENT_DATE GROUP BY ora ORDER BY ora`, [ristorante_id]);
        const chartData = orari.rows.map(r => ({ name: `${r.ora}:00`, ordini: parseInt(r.count) }));
        res.json({ incassi: incassi.rows[0], topDishes, chartData });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// Cassa Pagamento
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
        log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`; 
        
        await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); 
        if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); 
        await c.query('COMMIT'); 
        res.json({success:true}); 
    } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} 
});

// Menu
app.get('/api/menu/:slug', async (req, res) => {
    try {
        const rist = await pool.query('SELECT * FROM ristoranti WHERE slug = $1', [req.params.slug]);
        if (rist.rows.length === 0) return res.status(404).json({ error: "Non trovato" });
        const data = rist.rows[0];
        
        // --- MODIFICA QUERY: Aggiunto p.traduzioni e c.traduzioni ---
        const menu = await pool.query(`
            SELECT 
                p.*, 
                p.traduzioni as traduzioni,
                c.is_bar as categoria_is_bar, 
                c.is_pizzeria as categoria_is_pizzeria, 
                c.posizione as categoria_posizione, 
                c.nome as categoria_nome, 
                c.varianti_default as categoria_varianti,
                c.traduzioni as categoria_traduzioni
            FROM prodotti p 
            LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id 
            WHERE p.ristorante_id = $1 
            ORDER BY c.posizione ASC, p.posizione ASC
        `, [data.id]);
        
        res.json({
            id: data.id, 
            ristorante: data.nome,
            style: { 
                logo: data.logo_url, cover: data.cover_url, bg: data.colore_sfondo, 
                title: data.colore_titolo, text: data.colore_testo, price: data.colore_prezzo, 
                font: data.font_style, card_bg: data.colore_card, card_border: data.colore_border,
                btn_bg: data.colore_btn, btn_text: data.colore_btn_text,
                tavolo_bg: data.colore_tavolo_bg, tavolo_text: data.colore_tavolo_text,
                carrello_bg: data.colore_carrello_bg, carrello_text: data.colore_carrello_text,
                checkout_bg: data.colore_checkout_bg, checkout_text: data.colore_checkout_text,
                colore_modal_bg: data.colore_modal_bg, colore_modal_text: data.colore_modal_text,
                info_footer: data.info_footer,
                url_allergeni: data.url_allergeni,
                colore_footer_text: data.colore_footer_text,
                dimensione_footer: data.dimensione_footer,
                allineamento_footer: data.allineamento_footer,
                url_menu_giorno: data.url_menu_giorno,
                url_menu_pdf: data.url_menu_pdf
            },
            subscription_active: data.account_attivo !== false, 
            kitchen_active: data.cucina_super_active !== false, 
            ordini_abilitati: data.ordini_abilitati, 
            pw_cassa: data.pw_cassa, pw_cucina: data.pw_cucina, pw_pizzeria: data.pw_pizzeria, pw_bar: data.pw_bar,
            menu: menu.rows
        });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

// Polling
app.get('/api/polling/:ristorante_id', async (req, res) => {
    try {
        // Query corretta:
        // 1. NON chiamiamo più o.cliente (che non esiste).
        // 2. Prendiamo u.nome dalla tabella utenti (join tramite utente_id).
        const sql = `
            SELECT o.*, 
            u.nome as nome_da_utente,
            (SELECT COUNT(*) FROM ordini o2 WHERE o2.utente_id = o.utente_id AND o2.stato = 'pagato') as storico_ordini
            FROM ordini o 
            LEFT JOIN utenti u ON o.utente_id = u.id 
            WHERE o.ristorante_id = $1 AND o.stato != 'pagato' 
            ORDER BY o.data_ora ASC
        `;
        
        const r = await pool.query(sql, [req.params.ristorante_id]);
        
        const ordini = r.rows.map(o => { 
            try { 
                return { 
                    ...o, 
                    // MAPPING SICURO:
                    // Se la JOIN ha trovato un nome (utente registrato), usa quello.
                    // Altrimenti scrive "Ospite" (perché la colonna manuale non esiste).
                    cliente: o.nome_da_utente || "Ospite", 
                    prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti 
                }; 
            } 
            catch { return { ...o, prodotti: [] }; }
        });
        
        res.json({ nuovi_ordini: ordini });
    } catch (e) { 
        console.error("Polling error:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// ==========================================
//          GESTIONE PRODOTTI (Con Traduzioni)
// ==========================================

app.post('/api/prodotti', async (req, res) => {
    try {
        const { 
            nome, 
            prezzo, 
            categoria, 
            sottocategoria, 
            descrizione, 
            ristorante_id, 
            immagine_url, 
            varianti, 
            allergeni,
            traduzioni // <--- NUOVO CAMPO
        } = req.body;

        const max = await pool.query(
            'SELECT MAX(posizione) as max FROM prodotti WHERE ristorante_id = $1', 
            [ristorante_id]
        );
        const nuovaPosizione = (max.rows[0].max || 0) + 1;

        // QUERY AGGIORNATA CON TRADUZIONI
        const queryText = `
            INSERT INTO prodotti (
                nome, prezzo, categoria, sottocategoria, descrizione, 
                ristorante_id, immagine_url, posizione, varianti, allergeni, traduzioni
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        const values = [
            nome, 
            prezzo, 
            categoria, 
            sottocategoria || "", 
            descrizione || "", 
            ristorante_id, 
            immagine_url || "", 
            nuovaPosizione, 
            varianti || '{}',
            JSON.stringify(allergeni || []), 
            JSON.stringify(traduzioni || {}) // Salvataggio traduzioni
        ];

        await pool.query(queryText, values);
        res.json({ success: true });
    } catch (e) {
        console.error("Errore creazione prodotto:", e);
        res.status(500).json({ error: e.message });
    }
});

app.put('/api/prodotti/riordina', async (req, res) => { const { prodotti } = req.body; try { for (const prod of prodotti) { if (prod.categoria) await pool.query('UPDATE prodotti SET posizione = $1, categoria = $2 WHERE id = $3', [prod.posizione, prod.categoria, prod.id]); else await pool.query('UPDATE prodotti SET posizione = $1 WHERE id = $2', [prod.posizione, prod.id]); } res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });

app.put('/api/prodotti/:id', async (req, res) => {
    try {
        const { nome, prezzo, categoria, sottocategoria, descrizione, immagine_url, varianti, allergeni, traduzioni } = req.body;
        
        // QUERY AGGIORNATA CON TRADUZIONI
        await pool.query(
            'UPDATE prodotti SET nome=$1, prezzo=$2, categoria=$3, sottocategoria=$4, descrizione=$5, immagine_url=$6, varianti=$8, allergeni=$9, traduzioni=$10 WHERE id=$7', 
            [nome, prezzo, categoria, sottocategoria, descrizione, immagine_url, req.params.id, varianti, JSON.stringify(allergeni || []), JSON.stringify(traduzioni || {})]
        );
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: "Errore salvataggio prodotto" });
    }
});

app.delete('/api/prodotti/:id', async (req, res) => { try { await pool.query('DELETE FROM prodotti WHERE id=$1', [req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// ==========================================
//          GESTIONE CATEGORIE (Con Traduzioni)
// ==========================================

app.post('/api/categorie', async (req, res) => { 
    try { 
        const { nome, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni } = req.body; 
        const max = await pool.query('SELECT MAX(posizione) as max FROM categorie WHERE ristorante_id = $1', [ristorante_id]); 
        
        // QUERY AGGIORNATA CON TRADUZIONI
        await pool.query(
            'INSERT INTO categorie (nome, posizione, ristorante_id, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)', 
            [nome, (max.rows[0].max || 0) + 1, ristorante_id, is_bar || false, is_pizzeria || false, descrizione || "", varianti_default || '[]', JSON.stringify(traduzioni || {})]
        ); 
        res.json({success:true}); 
    } catch (e) { res.status(500).json({ error: e.message }); } 
});

app.put('/api/categorie/riordina', async (req, res) => { const { categorie } = req.body; try { for (const cat of categorie) await pool.query('UPDATE categorie SET posizione = $1 WHERE id = $2', [cat.posizione, cat.id]); res.json({ success: true }); } catch (err) { res.status(500).json({ error: err.message }); } });
app.get('/api/categorie/:ristorante_id', async (req, res) => { try { const r = await pool.query('SELECT * FROM categorie WHERE ristorante_id = $1 ORDER BY posizione ASC', [req.params.ristorante_id]); res.json(r.rows); } catch (e) { res.status(500).json({ error: "Err" }); } });

app.put('/api/categorie/:id', async (req, res) => { 
    try { 
        const { nome, is_bar, is_pizzeria, descrizione, varianti_default, traduzioni } = req.body;
        
        // QUERY AGGIORNATA CON TRADUZIONI
        await pool.query(
            'UPDATE categorie SET nome=$1, is_bar=$2, is_pizzeria=$3, descrizione=$4, varianti_default=$5, traduzioni=$6 WHERE id=$7', 
            [nome, is_bar, is_pizzeria, descrizione, varianti_default, JSON.stringify(traduzioni || {}), req.params.id]
        ); 
        res.json({ success: true }); 
    } catch (e) { res.status(500).json({ error: "Err" }); } 
});

app.delete('/api/categorie/:id', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 
        const { id } = req.params;
        const catRes = await client.query('SELECT nome, ristorante_id FROM categorie WHERE id = $1', [id]);
        if (catRes.rows.length > 0) {
            const { nome, ristorante_id } = catRes.rows[0];
            await client.query('DELETE FROM prodotti WHERE categoria = $1 AND ristorante_id = $2', [nome, ristorante_id]);
        }
        await client.query('DELETE FROM categorie WHERE id = $1', [id]);
        await client.query('COMMIT'); 
        res.json({ success: true });
    } catch (e) {
        await client.query('ROLLBACK');
        console.error("Errore cancellazione categoria:", e);
        res.status(500).json({ error: "Errore durante l'eliminazione" });
    } finally {
        client.release();
    }
});

// Config Ristorante
app.get('/api/ristorante/config/:id', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti WHERE id = $1', [req.params.id]); if (r.rows.length > 0) res.json(r.rows[0]); else res.status(404).json({ error: "Not Found" }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// 1. ROTTA DI FIX DATABASE (Lanciala visitando: /api/db-fix-menu)
app.get('/api/db-fix-menu', async (req, res) => {
    try {
        const cols = [
            "url_menu_giorno TEXT DEFAULT ''",
            "url_menu_pdf TEXT DEFAULT ''",
            "colore_footer_text TEXT DEFAULT '#888888'",
            "dimensione_footer TEXT DEFAULT '12'",
            "allineamento_footer TEXT DEFAULT 'center'"
        ];
        for (const c of cols) {
            await pool.query(`ALTER TABLE ristoranti ADD COLUMN IF NOT EXISTS ${c}`);
        }
        res.send("✅ DATABASE AGGIORNATO: Colonne Menu Giorno e PDF create!");
    } catch (e) { res.status(500).send("Errore DB: " + e.message); }
});

// 2. AGGIORNA STILE (PUT)
app.put('/api/ristorante/style/:id', async (req, res) => {
    try {
        const { 
            logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, 
            colore_card, colore_btn, colore_btn_text, colore_border,
            colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text,
            colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text,
            font_style, info_footer, url_allergeni,
            url_menu_giorno, url_menu_pdf 
        } = req.body;

        await pool.query(
            `UPDATE ristoranti SET 
            logo_url=$1, cover_url=$2, colore_sfondo=$3, colore_titolo=$4, colore_testo=$5, colore_prezzo=$6, 
            colore_card=$7, colore_btn=$8, colore_btn_text=$9, colore_border=$10,
            colore_tavolo_bg=$11, colore_tavolo_text=$12, colore_carrello_bg=$13, colore_carrello_text=$14,
            colore_checkout_bg=$15, colore_checkout_text=$16, colore_modal_bg=$17, colore_modal_text=$18,
            font_style=$19, info_footer=$20, url_allergeni=$21,
            url_menu_giorno=$22, url_menu_pdf=$23
            WHERE id=$24`,
            [
                logo_url, cover_url, colore_sfondo, colore_titolo, colore_testo, colore_prezzo, 
                colore_card, colore_btn, colore_btn_text, colore_border,
                colore_tavolo_bg, colore_tavolo_text, colore_carrello_bg, colore_carrello_text,
                colore_checkout_bg, colore_checkout_text, colore_modal_bg, colore_modal_text,
                font_style, info_footer, url_allergeni, 
                url_menu_giorno, url_menu_pdf, req.params.id 
            ]
        );
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Errore salvataggio" }); }
});

app.put('/api/ristorante/servizio/:id', async (req, res) => { try { const { id } = req.params; if (req.body.ordini_abilitati !== undefined) await pool.query('UPDATE ristoranti SET ordini_abilitati = $1 WHERE id = $2', [req.body.ordini_abilitati, id]); if (req.body.servizio_attivo !== undefined) await pool.query('UPDATE ristoranti SET servizio_attivo = $1 WHERE id = $2', [req.body.servizio_attivo, id]); res.json({ success: true }); } catch (e) { res.status(500).json({error:"Err"}); } });
app.put('/api/ristorante/security/:id', async (req, res) => { try { const { pw_cassa, pw_cucina, pw_pizzeria, pw_bar } = req.body; await pool.query(`UPDATE ristoranti SET pw_cassa=$1, pw_cucina=$2, pw_pizzeria=$3, pw_bar=$4 WHERE id=$5`, [pw_cassa, pw_cucina, pw_pizzeria, pw_bar, req.params.id]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });

// Upload / Login Rist / Auth Reparti
app.post('/api/upload', upload.single('photo'), (req, res) => res.json({ url: req.file.path }));
app.post('/api/login', async (req, res) => { const { email, password } = req.body; try { const result = await pool.query("SELECT * FROM ristoranti WHERE email = $1", [email]); if (result.rows.length > 0) { const ristorante = result.rows[0]; if (ristorante.password === password) { return res.json({ success: true, user: { id: ristorante.id, nome: ristorante.nome, slug: ristorante.slug } }); } } res.status(401).json({ success: false, error: "Credenziali errate" }); } catch (e) { res.status(500).json({ success: false, error: "Errore interno" }); } });
app.post('/api/auth/station', async (req, res) => { try { const { ristorante_id, role, password } = req.body; const roleMap = { 'cassa': 'pw_cassa', 'cucina': 'pw_cucina', 'pizzeria': 'pw_pizzeria', 'bar': 'pw_bar' }; const colonnaPwd = roleMap[role]; if (!colonnaPwd) return res.json({ success: false, error: "Ruolo non valido" }); const r = await pool.query(`SELECT id, nome, ${colonnaPwd} as password_reparto FROM ristoranti WHERE id = $1`, [ristorante_id]); if (r.rows.length === 0) return res.json({ success: false, error: "Ristorante non trovato" }); if (String(r.rows[0].password_reparto) === String(password)) res.json({ success: true, nome_ristorante: r.rows[0].nome }); else res.json({ success: false, error: "Password Errata" }); } catch (e) { res.status(500).json({ error: "Err" }); } });
app.get('/api/cassa/storico/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]); const ordini = r.rows.map(o => { try { return { ...o, prodotti: JSON.parse(o.prodotti) }; } catch { return { ...o, prodotti: [] }; }}); res.json(ordini); } catch (e) { res.status(500).json({ error: "Err" }); } });

// Excel Utenti
app.post('/api/utenti/import/excel', uploadFile.single('file'), async (req, res) => { try { if (!req.file) return res.status(400).json({ error: "File mancante" }); const workbook = xlsx.read(req.file.buffer, { type: 'buffer' }); const sheetName = workbook.SheetNames[0]; const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]); for (const row of data) { const ruolo = row.ruolo || 'cliente'; if(!row.email) continue; const check = await pool.query("SELECT id FROM utenti WHERE email = $1", [row.email]); if (check.rows.length > 0) { await pool.query("UPDATE utenti SET nome=$1, password=$2, telefono=$3, indirizzo=$4, ruolo=$5 WHERE email=$6", [row.nome, row.password, row.telefono, row.indirizzo, ruolo, row.email]); } else { await pool.query("INSERT INTO utenti (nome, email, password, telefono, indirizzo, ruolo) VALUES ($1, $2, $3, $4, $5, $6)", [row.nome, row.email, row.password, row.telefono, row.indirizzo, ruolo]); } } res.json({ success: true, message: "Importazione completata" }); } catch (e) { console.error(e); res.status(500).json({ error: "Errore Import" }); } });
// Excel Menu
app.post('/api/import-excel', uploadFile.single('file'), async (req, res) => {
    const { ristorante_id } = req.body;
    if (!req.file || !ristorante_id) return res.status(400).json({ error: "Dati mancanti." });

    const client = await pool.connect();
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
            
            const allergeniStr = row['Allergeni'] || "";
            const allergeniArr = allergeniStr.split(',').map(s => s.trim()).filter(Boolean);

            const variantiCatStr = row['Varianti Categoria (Default)'] || "";
            let variantiCatJson = [];
            if (variantiCatStr && variantiCatStr.includes(':')) {
                variantiCatJson = variantiCatStr.split(',').map(v => {
                    const parts = v.split(':');
                    if (parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) };
                    return null;
                }).filter(Boolean);
            }

            let catCheck = await client.query('SELECT * FROM categorie WHERE nome = $1 AND ristorante_id = $2', [categoria, ristorante_id]);
            if (catCheck.rows.length === 0) {
                await client.query(
                    'INSERT INTO categorie (nome, posizione, ristorante_id, descrizione, varianti_default) VALUES ($1, $2, $3, $4, $5)',
                    [categoria, nextCatPos++, ristorante_id, "", JSON.stringify(variantiCatJson)]
                );
            } else if (variantiCatStr.length > 0) {
                await client.query(
                    'UPDATE categorie SET varianti_default = $1 WHERE id = $2',
                    [JSON.stringify(variantiCatJson), catCheck.rows[0].id]
                );
            }

            const baseStr = row['Ingredienti Base (Rimovibili)'] || "";
            const aggiunteStr = row['Aggiunte Prodotto (Formato Nome:Prezzo)'] || "";
            const baseArr = baseStr.split(',').map(s => s.trim()).filter(Boolean);
            let aggiunteArr = [];
            if (aggiunteStr) {
                aggiunteArr = aggiunteStr.split(',').map(v => {
                    const parts = v.split(':');
                    if (parts.length >= 2) return { nome: parts[0].trim(), prezzo: parseFloat(parts[1]) };
                    return null;
                }).filter(Boolean);
            }
            const variantiProdotto = { base: baseArr, aggiunte: aggiunteArr };

            await client.query(
                `INSERT INTO prodotti (nome, prezzo, categoria, sottocategoria, descrizione, ristorante_id, posizione, varianti, allergeni) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    nome, 
                    prezzo, 
                    categoria, 
                    sottocategoria, 
                    descrizione, 
                    ristorante_id, 
                    nextProdPos++, 
                    JSON.stringify(variantiProdotto),
                    JSON.stringify(allergeniArr) 
                ]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Importazione completata: ${data.length} piatti inseriti!` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Errore Import Excel:", err);
        res.status(500).json({ error: err.message });
    } finally {
        client.release();
    }
});
app.get('/api/export-excel/:ristorante_id', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, c.varianti_default as cat_varianti 
             FROM prodotti p 
             LEFT JOIN categorie c ON p.categoria = c.nome AND p.ristorante_id = c.ristorante_id 
             WHERE p.ristorante_id = $1 
             ORDER BY c.posizione, p.posizione`, 
            [req.params.ristorante_id]
        );

        const dataForExcel = result.rows.map(row => {
            let baseStr = "", aggiunteStr = "", catVarStr = "", allergeniStr = "";
            try {
                const v = typeof row.varianti === 'string' ? JSON.parse(row.varianti) : (row.varianti || {});
                if(v.base && Array.isArray(v.base)) baseStr = v.base.join(', ');
                if(v.aggiunte && Array.isArray(v.aggiunte)) {
                    aggiunteStr = v.aggiunte.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', ');
                }
            } catch(e) { console.error("Errore parse varianti row:", row.id); }

            try {
                const cv = typeof row.cat_varianti === 'string' ? JSON.parse(row.cat_varianti) : (row.cat_varianti || []);
                if(Array.isArray(cv)) {
                    catVarStr = cv.map(a => `${a.nome}:${Number(a.prezzo).toFixed(2)}`).join(', ');
                }
            } catch(e) { console.error("Errore parse cat_varianti row:", row.id); }

            try {
                const all = typeof row.allergeni === 'string' ? JSON.parse(row.allergeni) : (row.allergeni || []);
                if(Array.isArray(all)) {
                    allergeniStr = all.join(', ');
                }
            } catch(e) { console.error("Errore parse allergeni row:", row.id); }

            return {
                "Categoria": row.categoria,
                "Varianti Categoria (Default)": catVarStr,
                "Sottocategoria": row.sottocategoria || "",
                "Nome": row.nome,
                "Prezzo": row.prezzo,
                "Descrizione": row.descrizione || "",
                "Ingredienti Base (Rimovibili)": baseStr,
                "Aggiunte Prodotto (Formato Nome:Prezzo)": aggiunteStr,
                "Allergeni": allergeniStr 
            };
        });

        const workbook = xlsx.utils.book_new();
        const worksheet = xlsx.utils.json_to_sheet(dataForExcel);
        
        const wscols = [
            {wch:15}, {wch:30}, {wch:15}, {wch:25}, {wch:10}, {wch:30}, {wch:30}, {wch:30}, {wch:30}
        ];
        worksheet['!cols'] = wscols;

        xlsx.utils.book_append_sheet(workbook, worksheet, "Menu");
        
        const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Disposition', 'attachment; filename="menu_export_completo.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (err) {
        console.error("Errore critico Export:", err);
        res.status(500).json({ error: "Errore durante l'esportazione Excel" });
    }
});

// Admin Super
app.get('/api/super/ristoranti', async (req, res) => { try { const r = await pool.query('SELECT * FROM ristoranti ORDER BY id ASC'); res.json(r.rows); } catch (e) { res.status(500).json({error:"Err"}); } });
app.post('/api/super/ristoranti', async (req, res) => { try { await pool.query(`INSERT INTO ristoranti (nome, slug, email, telefono, password, account_attivo, servizio_attivo, ordini_abilitati, cucina_super_active) VALUES ($1, $2, $3, $4, $5, TRUE, TRUE, TRUE, TRUE)`, [req.body.nome, req.body.slug, req.body.email, req.body.telefono, req.body.password || 'tonystark']); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.put('/api/super/ristoranti/:id', async (req, res) => { try { const { id } = req.params; if (req.body.account_attivo !== undefined) { await pool.query('UPDATE ristoranti SET account_attivo = $1 WHERE id = $2', [req.body.account_attivo, id]); return res.json({ success: true }); } if (req.body.cucina_super_active !== undefined) { await pool.query('UPDATE ristoranti SET cucina_super_active = $1 WHERE id = $2', [req.body.cucina_super_active, id]); return res.json({ success: true }); } let sql = "UPDATE ristoranti SET nome=$1, slug=$2, email=$3, telefono=$4"; let params = [req.body.nome, req.body.slug, req.body.email, req.body.telefono]; if (req.body.password) { sql += ", password=$5 WHERE id=$6"; params.push(req.body.password, id); } else { sql += " WHERE id=$5"; params.push(id); } await pool.query(sql, params); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });
app.delete('/api/super/ristoranti/:id', async (req, res) => { try { const id = req.params.id; await pool.query('DELETE FROM prodotti WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM categorie WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ordini WHERE ristorante_id = $1', [id]); await pool.query('DELETE FROM ristoranti WHERE id = $1', [id]); res.json({ success: true }); } catch (e) { res.status(500).json({error: "Err"}); } });

// ==========================================
//          LOGIN SUPER ADMIN (2FA)
// ==========================================
app.post('/api/super/login', (req, res) => {
    try {
        const { email, password, code2fa } = req.body;

        const adminEmail = process.env.ADMIN_EMAIL;       
        const adminPass = process.env.ADMIN_PASSWORD;     
        const adminSecret = process.env.ADMIN_2FA_SECRET; 

        if (!adminEmail || !adminPass || !adminSecret) {
            console.error("❌ ERRORE: Variabili d'ambiente ADMIN mancanti nel .env");
            return res.status(500).json({ success: false, error: "Configurazione Server Incompleta" });
        }

        if (email !== adminEmail || password !== adminPass) {
            return res.json({ success: false, error: "Credenziali non valide" });
        }

        const isValidToken = authenticator.check(code2fa, adminSecret);

        if (!isValidToken) {
            return res.json({ success: false, error: "Codice 2FA Errato o Scaduto" });
        }

        res.json({ success: true, token: "SUPER_GOD_TOKEN_2026" });

    } catch (e) {
        console.error("Errore Super Login:", e);
        res.status(500).json({ success: false, error: "Errore interno server" });
    }
});

app.post('/api/ordine/invia-produzione', async (req, res) => {
    try {
        const { id_ordine } = req.body;
        // Passa lo stato da 'in_arrivo' a 'in_attesa' (visibile ai reparti)
        await pool.query("UPDATE ordini SET stato = 'in_attesa' WHERE id = $1 AND stato = 'in_arrivo'", [id_ordine]);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Errore invio produzione" });
    }
});

app.listen(port, () => console.log(`🚀 SERVER V11 MULTILINGUA (Porta ${port})`));