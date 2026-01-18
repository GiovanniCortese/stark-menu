const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { getNowItaly, getTimeItaly } = require('../utils/time');

router.post('/ordine', async (req, res) => {
    try {
        const { ristorante_id, tavolo, prodotti, totale, cliente, cameriere, utente_id } = req.body;
        const isStaff = (cameriere && cameriere !== "null");
        let log = `[${getNowItaly()}] 🆕 ORDINE DA: ${isStaff ? cameriere : (cliente || "Ospite")}\n`;
        if (Array.isArray(prodotti)) prodotti.forEach(p => log += ` • ${p.nome} - ${Number(p.prezzo).toFixed(2)}€\n`);
        log += `TOTALE PARZIALE: ${Number(totale).toFixed(2)}€\n----------------------------------\n`;
        await pool.query(`INSERT INTO ordini (ristorante_id, tavolo, prodotti, totale, stato, dettagli, cameriere, utente_id, data_ora) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [ristorante_id, String(tavolo), JSON.stringify(prodotti), totale, isStaff ? 'in_attesa' : 'in_arrivo', log, isStaff ? cameriere : null, utente_id || null]);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/ordine/:id/patch-item', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { index, stato, operatore } = req.body;
        const cur = await client.query("SELECT prodotti, dettagli FROM ordini WHERE id = $1 FOR UPDATE", [req.params.id]);
        if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({error: "No Order"}); }
        let prod = typeof cur.rows[0].prodotti === 'string' ? JSON.parse(cur.rows[0].prodotti) : cur.rows[0].prodotti;
        let dett = cur.rows[0].dettagli || "";
        if (prod[index] && prod[index].stato !== stato) {
            prod[index].stato = stato;
            if (stato === 'servito') { prod[index].ora_servizio = getTimeItaly(); dett += `\n[${getNowItaly()}] [${operatore}] HA SERVITO: ${prod[index].nome}`; }
            else if (stato === 'in_attesa') { prod[index].riaperto = true; delete prod[index].ora_servizio; dett += `\n[${getNowItaly()}] [${operatore}] ⚠️ RIAPERTO: ${prod[index].nome}`; }
        }
        await client.query("UPDATE ordini SET prodotti = $1, dettagli = $2 WHERE id = $3", [JSON.stringify(prod), dett, req.params.id]);
        await client.query('COMMIT'); res.json({ success: true });
    } catch (e) { await client.query('ROLLBACK'); res.status(500).json({ error: "Err" }); } finally { client.release(); }
});

router.put('/ordine/:id/update-items', async (req, res) => {
    try {
        const { prodotti, totale, logMsg } = req.body;
        let q = "UPDATE ordini SET prodotti = $1", p = [JSON.stringify(prodotti)], i = 2;
        if(totale!==undefined){ q+=`, totale=$${i}`; p.push(totale); i++; }
        if(logMsg){ q+=`, dettagli=COALESCE(dettagli,'')||$${i}`; p.push(`\n[${getNowItaly()}] ${logMsg}`); i++; }
        q+=` WHERE id=$${i}`; p.push(req.params.id);
        await pool.query(q, p); res.json({success:true});
    } catch(e){ res.status(500).json({error:"Err"}); }
});

router.post('/ordine/invia-produzione', async (req, res) => {
    try { await pool.query("UPDATE ordini SET stato = 'in_attesa' WHERE id = $1 AND stato = 'in_arrivo'", [req.body.id_ordine]); res.json({ success: true }); } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.get('/polling/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query(`SELECT o.*, u.nome as nome_da_utente FROM ordini o LEFT JOIN utenti u ON o.utente_id = u.id WHERE o.ristorante_id = $1 AND o.stato != 'pagato' ORDER BY o.data_ora ASC`, [req.params.ristorante_id]);
        res.json({ nuovi_ordini: r.rows.map(o => ({ ...o, cliente: o.nome_da_utente || "Ospite", prodotti: typeof o.prodotti === 'string' ? JSON.parse(o.prodotti) : o.prodotti })) });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/ordini/cliente/:utente_id', async (req, res) => {
    try {
        const { utente_id } = req.params; const { tavolo } = req.query;
        let cond = [];
        if (tavolo && tavolo !== 'undefined') cond = (await pool.query("SELECT o.* FROM ordini o WHERE o.tavolo = $1 AND o.utente_id != $2 AND o.stato != 'pagato'", [tavolo, utente_id])).rows;
        const pers = (await pool.query(`SELECT o.*, r.nome as nome_ristorante FROM ordini o JOIN ristoranti r ON o.ristorante_id = r.id WHERE o.utente_id = $1 ORDER BY o.data_ora DESC`, [utente_id])).rows;
        const parse = (list, is_cond) => list.map(o => ({...o, prodotti: typeof o.prodotti==='string'?JSON.parse(o.prodotti):o.prodotti, is_condiviso: is_cond}));
        res.json({ personali: parse(pers, false), condivisi: parse(cond, true) });
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

router.post('/cassa/paga-tavolo', async (req, res) => {
    const c = await pool.connect();
    try {
        await c.query('BEGIN');
        const r = await c.query("SELECT * FROM ordini WHERE ristorante_id=$1 AND tavolo=$2 AND stato!='pagato'", [req.body.ristorante_id, String(req.body.tavolo)]);
        if(r.rows.length===0){await c.query('ROLLBACK');return res.json({success:true});}
        let tot=0, prod=[], log="";
        r.rows.forEach(o=>{ tot+=Number(o.totale||0); prod=[...prod, ...(typeof o.prodotti==='string'?JSON.parse(o.prodotti):o.prodotti)]; if(o.dettagli) log+=`\nORDINE #${o.id}\n${o.dettagli}`; });
        log+=`\n[${getNowItaly()}] 💰 CHIUSO E PAGATO: ${tot.toFixed(2)}€`;
        await c.query("UPDATE ordini SET stato='pagato', prodotti=$1, totale=$2, dettagli=$3 WHERE id=$4", [JSON.stringify(prod), tot, log, r.rows[0].id]);
        if(r.rows.length>1) await c.query("DELETE FROM ordini WHERE id = ANY($1::int[])", [r.rows.slice(1).map(o=>o.id)]);
        await c.query('COMMIT'); res.json({success:true});
    } catch(e){ await c.query('ROLLBACK'); res.status(500).json({error:"Err"}); } finally{c.release();}
});

router.get('/cassa/storico/:ristorante_id', async (req, res) => {
    try {
        const r = await pool.query("SELECT * FROM ordini WHERE ristorante_id = $1 AND stato = 'pagato' ORDER BY data_ora DESC LIMIT 50", [req.params.ristorante_id]);
        res.json(r.rows.map(o => ({ ...o, prodotti: typeof o.prodotti==='string'?JSON.parse(o.prodotti):o.prodotti })));
    } catch (e) { res.status(500).json({ error: "Err" }); }
});

module.exports = router;