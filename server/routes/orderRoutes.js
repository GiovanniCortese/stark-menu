// server/routes/orderRoutes.js - VERSIONE V89 (PIN CHECKER FIXED) 🛡️
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNowItaly, getTimeItaly } = require('../utils/time');

// --- 0. DB AUTO-FIX (CREAZIONE TABELLE) ---
(async function ensurePinColumns() {
  try {
    // 1. Creiamo la tabella tavoli se non esiste
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tavoli (
        id SERIAL PRIMARY KEY,
        ristorante_id INTEGER,
        numero VARCHAR(50),
        active_pin VARCHAR(10),
        stato VARCHAR(20) DEFAULT 'libero', -- libero, occupato
        last_update TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 2. Indice univoco per evitare duplicati tavolo nello stesso ristorante
    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tavoli_rist_num ON tavoli (ristorante_id, numero);`);
    
    // 3. Colonna pin_tavolo anche negli ordini (per storico)
    await pool.query(`ALTER TABLE ordini ADD COLUMN IF NOT EXISTS pin_tavolo VARCHAR(10);`);

    console.log("✅ DB Ordini: Tabelle PIN pronte.");
  } catch (e) {
    console.error("❌ DB Error Pin:", e.message);
  }
})();

const notifyUpdate = (req, ristorante_id) => {
    const io = req.app.get('io');
    if (io && ristorante_id) {
        const room = String(ristorante_id);
        io.to(room).emit('refresh_ordini'); 
    } else {
        // console.error("⚠️ Impossibile inviare notifica Socket");
    }
};

// --- 1. [NUOVO] API CLIENTE: VERIFICA PIN E RECUPERA TAVOLO ---
// QUESTA È LA PARTE CHE MANCAVA E CAUSAVA "ERRORE DI CONNESSIONE"
router.post('/api/tavolo/check-pin', async (req, res) => {
    try {
        const { ristorante_id, pin } = req.body;
        console.log(`🔍 CHECK PIN RICHIESTO: Rist ID ${ristorante_id}, PIN ${pin}`);

        const check = await pool.query(
            "SELECT numero FROM tavoli WHERE ristorante_id = $1 AND active_pin = $2", 
            [ristorante_id, String(pin)]
        );

        if (check.rows.length > 0) {
            console.log("✅ PIN TROVATO! Tavolo:", check.rows[0].numero);
            res.json({ success: true, tavolo: check.rows[0].numero });
        } else {
            console.warn("❌ PIN NON TROVATO");
            res.json({ success: false, error: "PIN non valido o scaduto." });
        }
    } catch (e) {
        console.error("Errore check-pin:", e);
        res.status(500).json({ error: "Errore server verifica PIN" });
    }
});

// --- 2. API CASSA: APRI TAVOLO & GENERA PIN ---
router.post('/api/cassa/tavolo/open', async (req, res) => {
    try {
        const { ristorante_id, tavolo } = req.body;
        
        // Genera PIN a 4 cifre casuale
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();

        // Upsert: Se il tavolo esiste aggiorna il PIN, altrimenti crealo
        const query = `
            INSERT INTO tavoli (ristorante_id, numero, active_pin, stato, last_update)
            VALUES ($1, $2, $3, 'occupato', NOW())
            ON CONFLICT (ristorante_id, numero) 
            DO UPDATE SET active_pin = $3, stato = 'occupato', last_update = NOW()
            RETURNING active_pin;
        `;
        
        const result = await pool.query(query, [ristorante_id, tavolo, newPin]);
        
        // Notifica Socket alla stanza (opzionale, per aggiornare le UI)
        const io = req.app.get('io');
        if(io) io.to(String(ristorante_id)).emit('refresh_tavoli');

        res.json({ success: true, pin: result.rows[0].active_pin });
    } catch (e) {
        console.error("Errore generazione PIN:", e);
        res.status(500).json({ error: "Errore server" });
    }
});

// --- 3. API PER LA CASSA: LEGGI STATO TAVOLI (PIN ATTIVI) ---
router.get('/api/cassa/tavoli/status/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT numero, active_pin, stato FROM tavoli WHERE ristorante_id = $1", [req.params.ristorante_id]);
        res.json(r.rows);
    } catch (e) {
        res.status(500).json({ error: "Errore loading tavoli" });
    }
});

// --- 4. CREA ORDINE (CON VERIFICA PIN) ---
router.post('/api/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id, coperti, pin_tavolo } = req.body; 
        
        // --- CONTROLLO PIN MODE ---
        const conf = await pool.query("SELECT pin_mode FROM ristoranti WHERE id = $1", [ristorante_id]);
        const pinModeActive = conf.rows[0]?.pin_mode;
        const isStaff = (cameriere && typeof cameriere === 'string' && cameriere.trim().length > 0 && cameriere !== "null");

        // Se PIN MODE è attivo e NON è staff, verifica il codice
        if (pinModeActive && !isStaff) {
            // Se manca il PIN nel body
            if (!pin_tavolo) {
                return res.status(403).json({ success: false, error: "Inserisci il PIN del tavolo." });
            }

            const checkPin = await pool.query(
                "SELECT active_pin FROM tavoli WHERE ristorante_id = $1 AND numero = $2", 
                [ristorante_id, tavolo]
            );

            const realPin = checkPin.rows[0]?.active_pin;

            if (!realPin) {
                return res.status(403).json({ success: false, error: "Tavolo non attivo. Chiedi al personale." });
            }

            if (String(realPin) !== String(pin_tavolo)) {
                return res.status(403).json({ success: false, error: "PIN Scaduto o Errato." });
            }
        }

        // --- PROCEDURA ORDINE STANDARD ---
        const dataOrdineLeggibile = getNowItaly(); 
        const statoIniziale = isStaff ? 'in_attesa' : 'in_arrivo';

        const nomeClienteDisplay = cliente || "Ospite";
        let logIniziale = `[${dataOrdineLeggibile}] 🆕 ORDINE DA: ${isStaff ? cameriere : nomeClienteDisplay}\n`;
        
        if(coperti && coperti > 0) logIniziale += `👥 COPERTI: ${coperti}\n`;

        if (Array.isArray(prodotti)) {
            prodotti.forEach(p => {
                let note = "";
                if(p.varianti_scelte) { 
                     if(p.varianti_scelte.rimozioni?.length > 0) note += ` (No: ${p.varianti_scelte.rimozioni.join(', ')})`;
                     if(p.varianti_scelte.aggiunte?.length > 0) note += ` (+: ${p.varianti_scelte.aggiunte.map(a=>a.nome).join(', ')})`;
                }
                const unita = p.unita_misura ? ` ${p.unita_misura}` : '';
                logIniziale += ` • ${p.nome}${note} - ${Number(p.prezzo).toFixed(2)}€${unita}\n`;
            });
        }
        logIniziale += `TOTALE PARZIALE: ${Number(totale).toFixed(2)}€\n----------------------------------\n`;

        // Inserimento con colonna PIN
        await pool.query(
            `INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id, data_ora, coperti, pin_tavolo) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9, $10, $11)`,
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, statoIniziale, logIniziale, isStaff ? cameriere : null, utente_id || null, coperti || 0, pin_tavolo || null]
        );

        notifyUpdate(req, ristorante_id);
        
        // Notifiche Reparti
        const io = req.app.get('io');
        if (io) {
            const room = String(ristorante_id);
            const hasBar = prodotti.some(p => p.is_bar);
            const hasCucina = prodotti.some(p => !p.is_bar && !p.is_pizzeria);
            const hasPizzeria = prodotti.some(p => p.is_pizzeria);

            if(hasBar) io.to(room).emit('suona_bar');
            if(hasCucina) io.to(room).emit('suona_cucina');
            if(hasPizzeria) io.to(room).emit('suona_pizzeria');
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
        const { id } = req.params;
        const { index, stato, operatore } = req.body; 
        const current = await client.query("SELECT prodotti, dettagli, ristorante_id FROM ordini WHERE id = $1 FOR UPDATE", [id]);
        if (current.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({error: "Ordine non trovato"}); }
        
        let prodotti = typeof current.rows[0].prodotti === 'string' ? JSON.parse(current.rows[0].prodotti) : current.rows[0].prodotti;
        let dettagli = current.rows[0].dettagli || "";
        const ristorante_id = current.rows[0].ristorante_id;

        if (prodotti[index]) {
            if (prodotti[index].stato === stato) { await client.query('ROLLBACK'); return res.json({ success: true }); }
            prodotti[index].stato = stato;
            if (stato === 'servito') {
                prodotti[index].ora_servizio = getTimeItaly(); 
                dettagli += `\n[${getNowItaly()}] [${operatore}] HA SERVITO: ${prodotti[index].nome}`;
            } else if (stato === 'in_attesa') {
                prodotti[index].riaperto = true;
                delete prodotti[index].ora_servizio;
                dettagli += `\n[${getNowItaly()}] [${operatore}] ⚠️ RIAPERTO: ${prodotti[index].nome}`;
            }
        }
        await client.query("UPDATE ordini SET prodotti = $1, dettagli = $2 WHERE id = $3", [JSON.stringify(prodotti), dettagli, id]);
        await client.query('COMMIT');
        notifyUpdate(req, ristorante_id);
        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: "Errore aggiornamento atomico" }); } finally { client.release(); }
});

router.put('/api/ordine/:id/update-items', async (req, res) => { 
    try { 
        const { prodotti, totale, logMsg } = req.body; 
        const rCheck = await pool.query("SELECT ristorante_id FROM ordini WHERE id=$1", [req.params.id]);
        if(rCheck.rows.length === 0) return res.status(404).json({error: "Not found"});
        const ristorante_id = rCheck.rows[0].ristorante_id;

        let q = "UPDATE ordini SET prodotti = $1"; 
        const p = [JSON.stringify(prodotti)]; 
        let i = 2; 
        if(totale!==undefined){ q+=`, totale=$${i}`; p.push(totale); i++ } 
        if(logMsg){ q+=`, dettagli=COALESCE(dettagli,'')||$${i}`; p.push(`\n[${getNowItaly()}] ${logMsg}`); i++ } 
        q+=` WHERE id=$${i}`; p.push(req.params.id); 
        await pool.query(q, p); 
        notifyUpdate(req, ristorante_id);
        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
});

router.post('/api/ordine/invia-produzione', async (req, res) => { 
    try { 
        const { id_ordine } = req.body; 
        const r = await pool.query("UPDATE ordini SET stato = 'in_attesa' WHERE id = $1 AND stato = 'in_arrivo' RETURNING ristorante_id", [id_ordine]); 
        if(r.rows.length > 0) notifyUpdate(req, r.rows[0].ristorante_id);
        res.json({ success: true }); 
    } catch (e) { console.error(e); res.status(500).json({ error: "Errore invio produzione" }); } 
});

router.get('/api/polling/:ristorante_id', async (req, res) => { try { const sql = `SELECT o.*, u.nome as nome_da_utente, (SELECT COUNT(*) FROM ordini o2 WHERE o2.utente_id = o.utente_id AND o2.stato = 'pagato') as storico_ordini FROM ordini o LEFT JOIN utenti u ON o.utente_id = u.id WHERE o.ristorante_id = $1 AND o.stato != 'pagato' ORDER BY o.data_ora ASC`; const r = await pool.query(sql, [req.params.ristorante_id]); const ordini = r.rows.map(o => { try { return { ...o, storico_ordini: parseInt(o.storico_ordini || 0), cliente: o.nome_da_utente || "Ospite", prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti }; } catch { return { ...o, prodotti: [] }; }}); res.json({ nuovi_ordini: ordini }); } catch (e) { console.error("Polling error:", e); res.status(500).json({ error: e.message }); } });

router.get('/api/ordini/cliente/:utente_id', async (req, res) => { 
    try { 
        const { utente_id } = req.params; 
        const { tavolo } = req.query; 
        const query = `SELECT o.*, r.nome as nome_ristorante FROM ordini o JOIN ristoranti r ON o.ristorante_id = r.id WHERE o.utente_id = $1 ORDER BY o.data_ora DESC`; 
        let ordiniTavolo = []; 
        if (tavolo && tavolo !== 'undefined') { 
            const rTavolo = await pool.query("SELECT o.*, r.nome as nome_ristorante FROM ordini o JOIN ristoranti r ON o.ristorante_id = r.id WHERE o.tavolo = $1 AND o.utente_id != $2 AND o.stato != 'pagato'", [tavolo, utente_id]); 
            ordiniTavolo = rTavolo.rows; 
        } 
        const rUser = await pool.query(query, [utente_id]); 
        const ordiniPersonali = rUser.rows.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti})); 
        const ordiniCondivisi = ordiniTavolo.map(o => ({...o, prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti, is_condiviso: true})); 
        res.json({ personali: ordiniPersonali, condivisi: ordiniCondivisi }); 
    } catch (e) { res.status(500).json({ error: "Errore storico" }); } 
});

router.post('/api/cassa/paga-tavolo', async (req, res) => { 
    const c = await pool.connect(); 
    try { 
        await c.query('BEGIN'); 
        const { ristorante_id, tavolo } = req.body; 
        
        // Chiudi ordini
        const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [ristorante_id, String(tavolo)]); 
        if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});} 
        let tot=0, prod=[], log=""; 
        r.rows.forEach(o=>{ tot+=Number(o.totale||0); let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} prod=[...prod, ...p]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; }); log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`; 
        await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); 
        if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); 
        
        await c.query('COMMIT'); 
        notifyUpdate(req, ristorante_id);
        res.json({success:true}); 
    } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} 
});

router.get('/api/cassa/storico/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]); const ordini = r.rows.map(o => { try { return { ...o, prodotti: JSON.parse(o.prodotti) }; } catch { return { ...o, prodotti: [] }; }}); res.json(ordini); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.get('/api/stats/dashboard/:ristorante_id', async (req, res) => { try { const { ristorante_id } = req.params; const incassi = await pool.query(`SELECT SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi, SUM(CASE WHEN data_ora::date = CURRENT_DATE - 1 THEN totale ELSE 0 END) as ieri FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'`, [ristorante_id]); const ordiniRecenti = await pool.query(`SELECT prodotti FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 500`, [ristorante_id]); const piattoCount = {}; ordiniRecenti.rows.forEach(row => { const prodotti = typeof row.prodotti === 'string' ? JSON.parse(row.prodotti) : row.prodotti; if(Array.isArray(prodotti)) prodotti.forEach(p => piattoCount[p.nome] = (piattoCount[p.nome] || 0) + 1); }); const topDishes = Object.entries(piattoCount).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, value: count })); const orari = await pool.query(`SELECT EXTRACT(HOUR FROM data_ora) as ora, COUNT(*) as count FROM ordini WHERE ristorante_id = $1 AND data_ora::date = CURRENT_DATE GROUP BY ora ORDER BY ora`, [ristorante_id]); const chartData = orari.rows.map(r => ({ name: `${r.ora}:00`, ordini: parseInt(r.count) })); res.json({ incassi: incassi.rows[0], topDishes, chartData }); } catch (e) { res.status(500).json({ error: "Err" }); } });

module.exports = router;