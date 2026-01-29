// server/routes/orderRoutes.js - VERSIONE V93 (FIX VERIFICA ROBUSTA)
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNowItaly } = require('../utils/time');

// --- 0. DB AUTO-FIX (ASSICURA COLONNE) ---
(async function ensurePinColumns() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS tavoli (id SERIAL PRIMARY KEY, ristorante_id INTEGER, numero VARCHAR(50), active_pin VARCHAR(10), stato VARCHAR(20) DEFAULT 'libero', coperti INTEGER DEFAULT 0, last_update TIMESTAMP DEFAULT NOW());`);
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tavoli_rist_num ON tavoli (ristorante_id, numero);`);
    await pool.query(`ALTER TABLE ordini ADD COLUMN IF NOT EXISTS pin_tavolo VARCHAR(10);`);
    await pool.query(`ALTER TABLE tavoli ADD COLUMN IF NOT EXISTS coperti INTEGER DEFAULT 0;`);
    console.log("✅ DB Ordini: Tabelle PIN & Coperti pronte.");
  } catch (e) { console.error("❌ DB Error Pin:", e.message); }
})();

const notifyUpdate = (req, ristorante_id) => {
    const io = req.app.get('io');
    if (io && ristorante_id) {
        io.to(String(ristorante_id)).emit('refresh_ordini'); 
        io.to(String(ristorante_id)).emit('refresh_tavoli');
    }
};

// --- 1. API CLIENTE: VERIFICA PIN ---
router.post('/api/menu/verify-pin', async (req, res) => {
    try {
        const { ristorante_id, pin } = req.body;
        
        // FIX CRITICO: Se manca l'ID ristorante, non possiamo cercare nulla
        if (!ristorante_id) {
            return res.json({ success: false, error: "Ristorante non identificato" });
        }

        // Cerca tavolo con questo PIN (Rimuoviamo il controllo rigido sullo stato 'occupato' per evitare bug)
        const check = await pool.query(
            "SELECT * FROM tavoli WHERE ristorante_id = $1 AND active_pin = $2", 
            [ristorante_id, String(pin)]
        );

        if (check.rows.length > 0) {
            const t = check.rows[0];
            // Se il tavolo era tecnicamente 'libero' ma aveva il PIN, correggiamolo ora
            if (t.stato !== 'occupato') {
                await pool.query("UPDATE tavoli SET stato='occupato' WHERE id=$1", [t.id]);
            }

            res.json({ 
                success: true, 
                tavolo: {
                    id: t.id,
                    numero: t.numero,
                    coperti: t.coperti
                }
            });
        } else {
            res.json({ success: false, error: "PIN non valido o scaduto." });
        }
    } catch (e) {
        console.error("Errore verify-pin:", e);
        res.status(500).json({ error: "Errore server verifica PIN" });
    }
});

// --- 2. API CASSA: APRI/CHIUDI TAVOLO ---
router.post('/api/cassa/tavolo/status', async (req, res) => {
    try {
        const { ristorante_id, numero, stato, coperti } = req.body;
        let active_pin = null;
        let query = "";
        let params = [];

        if (stato === 'occupato') {
            active_pin = Math.floor(1000 + Math.random() * 9000).toString();
            // UPSERT: Aggiorna o Inserisci
            query = `
                INSERT INTO tavoli (ristorante_id, numero, active_pin, stato, coperti, last_update)
                VALUES ($1, $2, $3, 'occupato', $4, NOW())
                ON CONFLICT (ristorante_id, numero) 
                DO UPDATE SET active_pin = $3, stato = 'occupato', coperti = $4, last_update = NOW()
                RETURNING *;
            `;
            params = [ristorante_id, numero, active_pin, coperti || 0];
        } else {
            // Chiudi (Reset totale)
            query = `
                UPDATE tavoli 
                SET stato = 'libero', active_pin = NULL, coperti = 0, last_update = NOW()
                WHERE ristorante_id = $1 AND numero = $2
                RETURNING *;
            `;
            params = [ristorante_id, numero];
        }
        
        const result = await pool.query(query, params);
        const io = req.app.get('io');
        if(io) io.to(String(ristorante_id)).emit('refresh_tavoli');

        res.json({ success: true, tavolo: result.rows[0] });
    } catch (e) {
        console.error("Errore stato tavolo:", e);
        res.status(500).json({ error: "Errore server" });
    }
});

// --- 3. API CASSA: LISTA TAVOLI ---
router.get('/api/cassa/tavoli/status/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT id, numero, active_pin, stato, coperti FROM tavoli WHERE ristorante_id = $1 ORDER BY numero ASC", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) { res.status(500).json({ error: "Errore loading tavoli" }); }
});

// --- 4. CREA ORDINE ---
router.post('/api/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id, coperti, pin_tavolo } = req.body; 
        
        const conf = await pool.query("SELECT pin_mode FROM ristoranti WHERE id = $1", [ristorante_id]);
        const pinModeActive = conf.rows[0]?.pin_mode;
        const isStaff = (cameriere && typeof cameriere === 'string' && cameriere.length > 0 && cameriere !== "null");

        // CHECK PIN LATO SERVER
        if (pinModeActive && !isStaff) {
            if (!pin_tavolo) return res.status(403).json({ success: false, error: "Inserisci il PIN del tavolo." });
            
            const checkPin = await pool.query("SELECT active_pin FROM tavoli WHERE ristorante_id = $1 AND numero = $2", [ristorante_id, tavolo]);
            const realPin = checkPin.rows[0]?.active_pin;

            if (!realPin || String(realPin) !== String(pin_tavolo)) {
                return res.status(403).json({ success: false, error: "PIN Scaduto o Errato." });
            }
        }

        const dataOrdineLeggibile = getNowItaly(); 
        const statoIniziale = isStaff ? 'in_attesa' : 'in_arrivo';
        const nomeClienteDisplay = cliente || "Ospite";
        
        let copertiFinali = coperti || 0;
        if (copertiFinali === 0) {
             const tInfo = await pool.query("SELECT coperti FROM tavoli WHERE ristorante_id=$1 AND numero=$2", [ristorante_id, tavolo]);
             if(tInfo.rows.length > 0) copertiFinali = tInfo.rows[0].coperti;
        }

        let logIniziale = `[${dataOrdineLeggibile}] 🆕 ORDINE DA: ${isStaff ? cameriere : nomeClienteDisplay}\n`;
        if(copertiFinali > 0) logIniziale += `👥 COPERTI: ${copertiFinali}\n`;

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

        await pool.query(
            `INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id, data_ora, coperti, pin_tavolo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)`,
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, statoIniziale, logIniziale, isStaff ? cameriere : null, utente_id || null, copertiFinali, pin_tavolo || null]
        );

        notifyUpdate(req, ristorante_id);
        const io = req.app.get('io');
        if (io) {
            const room = String(ristorante_id);
            if(prodotti.some(p => p.is_bar)) io.to(room).emit('suona_bar');
            if(prodotti.some(p => !p.is_bar && !p.is_pizzeria)) io.to(room).emit('suona_cucina');
            if(prodotti.some(p => p.is_pizzeria)) io.to(room).emit('suona_pizzeria');
        }

        res.json({ success: true });
    } catch (e) { 
        console.error("Errore Ordine:", e);
        res.status(500).json({ error: "Errore inserimento ordine: " + e.message }); 
    }
});

// --- ALTRE ROTTE STANDARD (Patch, Update, ecc) ---
router.put('/api/ordine/:id/patch-item', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 
        const { id } = req.params; const { index, stato, operatore } = req.body; 
        const current = await client.query("SELECT prodotti, dettagli, ristorante_id FROM ordini WHERE id = $1 FOR UPDATE", [id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({error: "Ordine non trovato"}); }
        let prodotti = typeof current.rows[0].prodotti === 'string' ? JSON.parse(current.rows[0].prodotti) : current.rows[0].prodotti;
        let dettagli = current.rows[0].dettagli || "";
        const ristorante_id = current.rows[0].ristorante_id;
        if (prodotti[index]) {
            prodotti[index].stato = stato;
            if (stato === 'servito') { prodotti[index].ora_servizio = getNowItaly().split(', ')[1].slice(0,5); dettagli += `\n[${getNowItaly()}] [${operatore}] HA SERVITO: ${prodotti[index].nome}`; }
            else if (stato === 'in_attesa') { prodotti[index].riaperto = true; delete prodotti[index].ora_servizio; dettagli += `\n[${getNowItaly()}] [${operatore}] ⚠️ RIAPERTO: ${prodotti[index].nome}`; }
        }
        await client.query("UPDATE ordini SET prodotti = $1, dettagli = $2 WHERE id = $3", [JSON.stringify(prodotti), dettagli, id]);
        await client.query('COMMIT'); notifyUpdate(req, ristorante_id); res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: "Err" }); } finally { client.release(); }
});

router.put('/api/ordine/:id/update-items', async (req, res) => { try { const { prodotti, totale, logMsg } = req.body; const rCheck = await pool.query("SELECT ristorante_id FROM ordini WHERE id=$1", [req.params.id]); if(rCheck.rows.length === 0) return res.status(404).json({error: "Not found"}); const ristorante_id = rCheck.rows[0].ristorante_id; let q = "UPDATE ordini SET prodotti = $1"; const p = [JSON.stringify(prodotti)]; let i = 2; if(totale!==undefined){ q+=`, totale=$${i}`; p.push(totale); i++ } if(logMsg){ q+=`, dettagli=COALESCE(dettagli,'')||$${i}`; p.push(`\n[${getNowItaly()}] ${logMsg}`); i++ } q+=` WHERE id=$${i}`; p.push(req.params.id); await pool.query(q, p); notifyUpdate(req, ristorante_id); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });
router.post('/api/ordine/invia-produzione', async (req, res) => { try { const { id_ordine } = req.body; const r = await pool.query("UPDATE ordini SET stato = 'in_attesa' WHERE id = $1 AND stato = 'in_arrivo' RETURNING ristorante_id", [id_ordine]); if(r.rows.length > 0) notifyUpdate(req, r.rows[0].ristorante_id); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.get('/api/polling/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato != 'pagato'", [req.params.ristorante_id]); res.json({ nuovi_ordini: r.rows.map(o=>({...o, prodotti: typeof o.prodotti==='string'?JSON.parse(o.prodotti):o.prodotti})) }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.get('/api/ordini/cliente/:utente_id', async (req, res) => { try { const { utente_id } = req.params; const { tavolo } = req.query; let ordiniTavolo = []; if (tavolo && tavolo !== 'undefined') { const rT = await pool.query("SELECT * FROM ordini WHERE tavolo = $1 AND utente_id != $2 AND stato != 'pagato'", [tavolo, utente_id]); ordiniTavolo = rT.rows; } const rU = await pool.query("SELECT * FROM ordini WHERE utente_id = $1 ORDER BY data_ora DESC", [utente_id]); res.json({ personali: rU.rows.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti})), condivisi: ordiniTavolo.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti, is_condiviso: true})) }); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.post('/api/cassa/paga-tavolo', async (req, res) => { const c = await pool.connect(); try { await c.query('BEGIN'); const { ristorante_id, tavolo } = req.body; const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [ristorante_id, String(tavolo)]); await c.query("UPDATE tavoli SET stato='libero', active_pin=NULL, coperti=0 WHERE ristorante_id=$1 AND numero=$2", [ristorante_id, String(tavolo)]); if(r.rows.length===0){await c.query('COMMIT'); notifyUpdate(req, ristorante_id); return res.json({success:true});} let tot=0, prod=[], log=""; r.rows.forEach(o=>{ tot+=Number(o.totale||0); let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} prod=[...prod, ...p]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; }); log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`; await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); await c.query('COMMIT'); notifyUpdate(req, ristorante_id); res.json({success:true}); } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} });
router.get('/api/cassa/storico/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]); res.json(r.rows.map(o => ({ ...o, prodotti: typeof o.prodotti==='string'?JSON.parse(o.prodotti):o.prodotti }))); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.get('/api/stats/dashboard/:ristorante_id', async (req, res) => { try { const { ristorante_id } = req.params; const incassi = await pool.query(`SELECT SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'`, [ristorante_id]); res.json({ incassi: incassi.rows[0], topDishes: [], chartData: [] }); } catch (e) { res.status(500).json({ error: "Err" }); } });

module.exports = router;