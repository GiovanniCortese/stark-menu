const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const PDFDocument = require('pdfkit-table');
const xlsx = require('xlsx');
const { getItalyDateComponents } = require('../utils/time');

router.get('/assets/:ristorante_id', async (req, res) => { try { const r = await pool.query("SELECT * FROM haccp_assets WHERE ristorante_id = $1", [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/assets', async (req, res) => { try { await pool.query(`INSERT INTO haccp_assets (ristorante_id, nome, tipo, range_min, range_max, marca, modello, serial_number, foto_url, etichetta_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [req.body.ristorante_id, req.body.nome, req.body.tipo, req.body.range_min, req.body.range_max, req.body.marca, req.body.modello, req.body.serial_number, req.body.foto_url, req.body.etichetta_url]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.put('/assets/:id', async (req, res) => { try { await pool.query(`UPDATE haccp_assets SET nome=$1, tipo=$2, range_min=$3, range_max=$4 WHERE id=$5`, [req.body.nome, req.body.tipo, req.body.range_min, req.body.range_max, req.params.id]); res.json({success:true}); } catch(e) { res.status(500).json({error:e.message}); } });
router.delete('/assets/:id', async (req, res) => { try { await pool.query("DELETE FROM haccp_assets WHERE id=$1", [req.params.id]); res.json({success:true}); } catch(e){ res.status(500).json({error:"Err"}); } });

router.get('/logs/:ristorante_id', async (req, res) => { try { const r = await pool.query(`SELECT l.*, a.nome as asset FROM haccp_logs l LEFT JOIN haccp_assets a ON l.asset_id = a.id WHERE l.ristorante_id = $1 ORDER BY l.data_ora DESC`, [req.params.ristorante_id]); res.json(r.rows); } catch(e) { res.status(500).json({error:"Err"}); } });
router.post('/logs', async (req, res) => { try { await pool.query("INSERT INTO haccp_logs (ristorante_id, asset_id, operatore, tipo_log, valore, conformita, azione_correttiva, foto_prova_url) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)", [req.body.ristorante_id, req.body.asset_id, req.body.operatore, req.body.tipo_log, req.body.valore, req.body.conformita, req.body.azione_correttiva, req.body.foto_prova_url]); res.json({success:true}); } catch(e) { res.status(500).json({error:"Err"}); } });

router.post('/labels', async (req, res) => {
    try {
        const t = getItalyDateComponents();
        const lotto = `L-${t.year}${t.month}${t.day}-${t.hour}${t.minute}`;
        const r = await pool.query("INSERT INTO haccp_labels (ristorante_id, prodotto, lotto, data_produzione, data_scadenza, operatore, tipo_conservazione, ingredienti) VALUES ($1,$2,$3,NOW(),$4,$5,$6,$7) RETURNING *", [req.body.ristorante_id, req.body.prodotto, lotto, req.body.data_scadenza, req.body.operatore, req.body.tipo_conservazione, req.body.ingredienti||'']);
        res.json({success:true, label: r.rows[0]});
    } catch(e) { res.status(500).json({error:"Err"}); }
});

router.get('/export/:tipo/:ristorante_id', async (req, res) => {
    try {
        const { tipo, ristorante_id } = req.params;
        const azi = (await pool.query("SELECT nome FROM ristoranti WHERE id=$1", [ristorante_id])).rows[0];
        let data = [];
        if(tipo === 'temperature') data = (await pool.query("SELECT * FROM haccp_logs WHERE ristorante_id=$1", [ristorante_id])).rows;
        else if(tipo === 'merci') data = (await pool.query("SELECT * FROM haccp_merci WHERE ristorante_id=$1", [ristorante_id])).rows;
        
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(data), tipo);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }));
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;