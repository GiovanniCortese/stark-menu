const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNowItaly, getTimeItaly } = require('../utils/time');

// Funzione Helper per emettere evento Socket
const notifyUpdate = (req, ristorante_id) => {
    const io = req.app.get('io');
    if (io && ristorante_id) {
        // Emette l'evento 'refresh_ordini' solo ai client nella stanza di quel ristorante
        io.to(String(ristorante_id)).emit('refresh_ordini');
        console.log(`🔔 Notifica inviata alla stanza: ${ristorante_id}`);
    }
};

// Crea Ordine
router.post('/api/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id } = req.body;
        // ... (tua logica logIniziale invariata) ...
        const dataOrdineLeggibile = getNowItaly(); 
        const isStaff = (cameriere && typeof cameriere === 'string' && cameriere.trim().length > 0 && cameriere !== "null");
        const statoIniziale = isStaff ? 'in_attesa' : 'in_arrivo';
        const nomeClienteDisplay = cliente || "Ospite";
        let logIniziale = `[${dataOrdineLeggibile}] 🆕 ORDINE DA: ${isStaff ? cameriere : nomeClienteDisplay}\n`;
        
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
            `INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id, data_ora) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, statoIniziale, logIniziale, isStaff ? cameriere : null, utente_id || null]
        );
        
        // 🔥 NOTIFICA SOCKET
        notifyUpdate(req, ristorante_id);
        
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Errore inserimento ordine: " + e.message }); }
});

// Patch Singolo Prodotto (cucina/bar/pizzeria)
router.put('/api/ordine/:id/patch-item', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN'); 
        const { id } = req.params;
        const { index, stato, operatore } = req.body; 
        
        // Selezioniamo anche ristorante_id per sapere a chi notificare
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
        
        // 🔥 NOTIFICA SOCKET
        notifyUpdate(req, ristorante_id);

        res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: "Errore aggiornamento atomico" }); } finally { client.release(); }
});

// Update Ordine Generico (usato dalla cassa per modifiche)
router.put('/api/ordine/:id/update-items', async (req, res) => { 
    try { 
        const { prodotti, totale, logMsg } = req.body; 
        
        // Recupero ristorante_id prima dell'update per notificare la stanza giusta
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
        
        // 🔥 NOTIFICA SOCKET
        notifyUpdate(req, ristorante_id);

        res.json({success:true}); 
    } catch(e){ res.status(500).json({error:"Err"}); } 
});

// Invia Produzione (Cassa conferma ordine cliente)
router.post('/api/ordine/invia-produzione', async (req, res) => { 
    try { 
        const { id_ordine } = req.body; 
        const r = await pool.query("UPDATE ordini SET stato = 'in_attesa' WHERE id = $1 AND stato = 'in_arrivo' RETURNING ristorante_id", [id_ordine]); 
        
        if(r.rows.length > 0) {
            // 🔥 NOTIFICA SOCKET
            notifyUpdate(req, r.rows[0].ristorante_id);
        }
        res.json({ success: true }); 
    } catch (e) { console.error(e); res.status(500).json({ error: "Errore invio produzione" }); } 
});

// Polling Ordini (Resta uguale, ma verrà chiamato molto meno)
router.get('/api/polling/:ristorante_id', async (req, res) => { try { const sql = `SELECT o.*, u.nome as nome_da_utente, (SELECT COUNT(*) FROM ordini o2 WHERE o2.utente_id = o.utente_id AND o2.stato = 'pagato') as storico_ordini FROM ordini o LEFT JOIN utenti u ON o.utente_id = u.id WHERE o.ristorante_id = $1 AND o.stato != 'pagato' ORDER BY o.data_ora ASC`; const r = await pool.query(sql, [req.params.ristorante_id]); const ordini = r.rows.map(o => { try { return { ...o, storico_ordini: parseInt(o.storico_ordini || 0), cliente: o.nome_da_utente || "Ospite", prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti }; } catch { return { ...o, prodotti: [] }; }}); res.json({ nuovi_ordini: ordini }); } catch (e) { console.error("Polling error:", e); res.status(500).json({ error: e.message }); } });

// Pagamento Tavolo (Cassa)
router.post('/api/cassa/paga-tavolo', async (req, res) => { 
    const c = await pool.connect(); 
    try { 
        await c.query('BEGIN'); 
        const { ristorante_id, tavolo } = req.body; // ristorante_id arriva dal body
        
        const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [ristorante_id, String(tavolo)]); 
        if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});} 
        // ... (Logica calcolo totale invariata) ...
        let tot=0, prod=[], log=""; 
        r.rows.forEach(o=>{ tot+=Number(o.totale||0); let p=[]; try{p=JSON.parse(o.prodotti)}catch(e){} prod=[...prod, ...p]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; }); log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`; 
        
        await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]); 
        if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]); 
        
        await c.query('COMMIT'); 
        
        // 🔥 NOTIFICA SOCKET
        notifyUpdate(req, ristorante_id);

        res.json({success:true}); 
    } catch(e){await c.query('ROLLBACK'); res.status(500).json({error:"Err"});} finally{c.release();} 
});

// (Le altre rotte GET statistiche o storico utente non necessitano di notifiche socket immediate, restano uguali)
router.get('/api/ordini/cliente/:utente_id', require('./orderRoutes').stack[5].handle); // Re-uso la tua logica esistente
router.get('/api/cassa/storico/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]); const ordini = r.rows.map(o => { try { return { ...o, prodotti: JSON.parse(o.prodotti) }; } catch { return { ...o, prodotti: [] }; }}); res.json(ordini); } catch (e) { res.status(500).json({ error: "Err" }); } });
router.get('/api/stats/dashboard/:ristorante_id', async (req, res) => { try { const { ristorante_id } = req.params; const incassi = await pool.query(`SELECT SUM(CASE WHEN data_ora::date = CURRENT_DATE THEN totale ELSE 0 END) as oggi, SUM(CASE WHEN data_ora::date = CURRENT_DATE - 1 THEN totale ELSE 0 END) as ieri FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato'`, [ristorante_id]); const ordiniRecenti = await pool.query(`SELECT prodotti FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 500`, [ristorante_id]); const piattoCount = {}; ordiniRecenti.rows.forEach(row => { const prodotti = typeof row.prodotti === 'string' ? JSON.parse(row.prodotti) : row.prodotti; if(Array.isArray(prodotti)) prodotti.forEach(p => piattoCount[p.nome] = (piattoCount[p.nome] || 0) + 1); }); const topDishes = Object.entries(piattoCount).sort((a,b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, value: count })); const orari = await pool.query(`SELECT EXTRACT(HOUR FROM data_ora) as ora, COUNT(*) as count FROM ordini WHERE ristorante_id = $1 AND data_ora::date = CURRENT_DATE GROUP BY ora ORDER BY ora`, [ristorante_id]); const chartData = orari.rows.map(r => ({ name: `${r.ora}:00`, ordini: parseInt(r.count) })); res.json({ incassi: incassi.rows[0], topDishes, chartData }); } catch (e) { res.status(500).json({ error: "Err" }); } });

module.exports = router;